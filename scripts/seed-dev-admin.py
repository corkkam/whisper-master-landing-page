#!/usr/bin/env python3
"""Throwaway fixture seeder for eyeballing /admin against the DEV Clerk
instance and the LOCAL Supabase stack. Not part of the app, not imported by it,
and safe only because both targets are scratch: it refuses to run against
anything but an sk_test key and 127.0.0.1.

Run:   python3 scripts/seed-dev-admin.py seed
Clean: python3 scripts/seed-dev-admin.py clean
"""
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

ENV = {}
for line in open(".env.local"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        ENV[k] = v.strip().strip('"')

SK = ENV["CLERK_SECRET_KEY"]
assert SK.startswith("sk_test"), "refusing to run against a live Clerk instance"
assert "127.0.0.1" in ENV["NEXT_PUBLIC_SUPABASE_URL"], "refusing to run against remote Supabase"

DB = ["docker", "exec", "-i", "supabase_db_whisper-master-landing-page",
      "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]

FIXTURES = [
    # first, last, company, role, platform, source, days_ago, approved, use_case
    ("Priya", "Raman", "Raman & Co Solicitors", "Founder / Exec", "Mac", "Twitter / X", 41, True,
     "Client attendance notes. We cannot send audio to a US processor."),
    ("Tom", "Whitfield", "Northgate Clinic", "Other", "Mac", "Friend or colleague", 33, True,
     "Consultation notes between patients."),
    ("Dana", "Okafor", "Okafor Legal", "Founder / Exec", "Mac", "Search", 26, False,
     "Dictating advice letters. Our insurer bars cloud dictation."),
    ("Sam", "Ellis", None, "Developer", "Mac", "Twitter / X", 19, False,
     "Commit messages and code review comments without leaving the keyboard."),
    ("Mira", "Lindqvist", "Halden Psykologi", "Other", "Mac", "Newsletter", 11, False,
     "Session notes. Patient confidentiality means nothing leaves the machine."),
    ("Ben", "Turner", None, "Writer", "Mac", None, 4, False, None),
]

APPS = [
    ("com.apple.mail", "Mail"),
    ("com.tinyspeck.slackmacgap", "Slack"),
    ("com.microsoft.VSCode", "Visual Studio Code"),
    ("com.apple.Notes", "Notes"),
    ("com.google.Chrome", "Chrome"),
]


def clerk(method, path, body=None):
    req = urllib.request.Request(
        f"https://api.clerk.com/v1{path}",
        method=method,
        # Clerk's edge sits behind Cloudflare, which 1010s urllib's default
        # agent string outright. Any real-looking UA gets through.
        headers={
            "Authorization": f"Bearer {SK}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8.7.1",
        },
        data=json.dumps(body).encode() if body is not None else None,
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or "null")


def email_for(first, last):
    return f"{first.lower()}.{last.lower()}+clerk_test@example.com"


def sql(statements):
    subprocess.run(DB, input="\n".join(statements), text=True, check=True,
                   stdout=subprocess.DEVNULL)


def seed():
    created = []
    for first, last, company, role, platform, source, days, approved, use_case in FIXTURES:
        made = datetime.now(timezone.utc) - timedelta(days=days)
        body = {
            "email_address": [email_for(first, last)],
            "first_name": first,
            "last_name": last,
            "password": "fixture-passphrase-9f21",
            "skip_password_checks": True,
            "created_at": made.isoformat(),
            "public_metadata": (
                {"betaAccess": True, "betaJoinedAt": (made + timedelta(days=2)).date().isoformat()}
                if approved else {}
            ),
        }
        try:
            user = clerk("POST", "/users", body)
        except urllib.error.HTTPError as e:
            print(f"skip {first}: {e.read().decode()[:120]}")
            continue
        created.append((user["id"], first, last, company, role, platform, source, days, use_case))
        print("created", user["id"], email_for(first, last))

    rows = []
    for uid, first, last, company, role, platform, source, days, use_case in created:
        made = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        rows.append(
            "insert into waitlist_entries (user_id, email, full_name, company, role, use_case, "
            "platform, referral_source, created_at) values ("
            f"{q(uid)}, {q(email_for(first, last))}, {q(first + ' ' + last)}, {q(company)}, "
            f"{q(role)}, {q(use_case)}, {q(platform)}, {q(source)}, {q(made)}) "
            "on conflict (user_id) do nothing;"
        )
    if rows:
        sql(rows)

    # Usage: the first four fixtures dictate, with a plausible ramp.
    usage = []
    for i, (uid, *_rest) in enumerate(created[:4]):
        for d in range(30):
            day = (datetime.now(timezone.utc) - timedelta(days=d)).date().isoformat()
            if (d + i) % 4 == 0:
                continue
            dictations = 6 + ((d * 7 + i * 13) % 22)
            words = dictations * (28 + (d % 11))
            per_app = {}
            for k, (bundle, name) in enumerate(APPS):
                if (d + k + i) % 3:
                    share = max(dictations // (k + 2), 1)
                    per_app[bundle] = {"name": name, "words": words // (k + 2), "count": share}
            usage.append(
                "insert into usage_daily (user_id, day, words, dictations, duration_seconds, "
                "fixes_words_corrected, fixes_dictionary, per_app) values ("
                f"{q(uid)}, {q(day)}, {words}, {dictations}, {dictations * 11.5}, "
                f"{words // 14}, {dictations // 5}, {q(json.dumps(per_app))}::jsonb) "
                "on conflict (user_id, day) do nothing;"
            )
    if usage:
        sql(usage)
    print(f"seeded {len(created)} accounts, {len(usage)} usage days")


def clean():
    removed = 0
    users = clerk("GET", "/users?limit=100")
    for u in users:
        if any("+clerk_test@example.com" in e["email_address"] for e in u["email_addresses"]):
            clerk("DELETE", f"/users/{u['id']}")
            sql([f"delete from usage_daily where user_id = {q(u['id'])};",
                 f"delete from waitlist_entries where user_id = {q(u['id'])};"])
            removed += 1
            print("removed", u["id"])
    print(f"removed {removed} fixtures")


def q(v):
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "seed"
    (seed if cmd == "seed" else clean)()
