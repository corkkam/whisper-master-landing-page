/**
 * The lid.
 *
 * With the band hanging in the top edge, the viewport is being read as a Mac
 * display — and a display is not an edgeless plane. It has a bezel, thicker
 * along the top because that is the edge holding the camera, and its corners
 * are radiused with bezel showing outside the curve. That is the whole of what
 * this draws: one ring, four numbers, in `.screen-bezel`.
 *
 * Deliberately *not* an even border. An evenly weighted rectangle around the
 * page is a picture frame, and a picture frame says "here is a screenshot of a
 * machine". The lid's own proportions — heavy top, hairline sides — say the
 * opposite, which is the reading the notch needs: you are not looking at the
 * product, you are sitting in front of it.
 *
 * Server-rendered and inert: no state, no listeners, no pointer events. It sits
 * above every layer including the contents sheet, because the machine does not
 * go behind the software running on it.
 *
 * `.screen-corners` is the second half of "bezel showing outside the curve"
 * above. The bezel is a rounded box, so the four wedges between its radius and
 * the square viewport were never its to paint — the page canvas showed through
 * them instead, putting a cream notch in each corner of an otherwise black lid.
 * A separate square layer fills them, because a rounded element cannot paint
 * outside its own radius.
 */
export default function ScreenFrame() {
  return (
    <>
      <div className="screen-bezel" aria-hidden="true" />
      <div className="screen-corners" aria-hidden="true" />
    </>
  );
}
