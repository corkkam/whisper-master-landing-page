// X/Twitter renders the same card. Re-exported rather than duplicated so the
// two can never drift — a share card that differs by platform is a bug nobody
// notices until launch day.
export { default, alt, size, contentType } from "./opengraph-image";
