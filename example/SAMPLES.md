# Sample photos

The stock photos in [`src/samples.ts`](src/samples.ts) are curated Unsplash
photos, pinned by photo id. Nothing is bundled in the repo: `images.unsplash.com`
needs no API key and the URLs are stable.

The stock strip needs a connection every time: `downloadSample()` deletes and
re-fetches on each tap, so picking a sample is never offline. Only the benchmark
corpus is cached (it skips photos already on disk). Making the strip cache too is
a one-line change, deliberately not made while these URLs are still being
swapped around — a cached file would outlive the id it was named for.

## Why they are curated and not queried

`source.unsplash.com/featured/?<keyword>` — the old "give me a photo of X" URL —
was retired and now returns 503, so there is no runtime keyword lookup to use.
That is just as well: a keyword query returns whatever, and "whatever" is how the
demo ended up detecting poses in 128×128 headshots. Each photo here was picked by
looking at it, for one specific thing it exercises, and its `expect` line says
what that is.

## What each set is for

| Set | Screen(s) | Picked for |
| --- | --- | --- |
| `POSES` | pose | one whole body per frame, across the classifier's branches |
| `FACES` | faces, facemesh | face counts, angles, classification, occlusion, and a zero |
| `PERSONS` | recognition | three distinct individuals, one face each |
| `PEOPLE` | selfieseg | person vs background, including no person |
| `SUBJECTS` | subjectseg | one salient subject, plus one ambiguous scene |
| `OBJECTS` | objects | the base model's coarse categories, plus a miss |
| `SCENES` | labeling | scenes that map onto the 400+ label set |
| `TEXTS` | ocr | real-world text: signs, print, chalk, cursive, two scripts |
| `CODES` | barcode | generated codes that always decode, then codes in the wild |
| `BENCH` | benchmark | 40 photos at ~4 MP with a realistic face-count mix |

## Known gaps

- **A receipt.** None of the candidates had a legible one. Best filled with the
  in-app camera.
- **`eulerAngleZ` (head roll).** Unsplash does not index by head pose, so there
  is no reliable sample. Trivially demonstrated by tilting the camera.
- **The same person in two photos**, which is what would make the recognition
  screen a real test rather than a same-photo lookup.
- **Photographed 1D barcodes.** The wild samples are QR only; stock photos rarely
  show a barcode at decodable resolution.

## Credits

Every photo is under the [Unsplash License](https://unsplash.com/license), which
allows this use without permission or attribution. Credited anyway.

| Set | Sample | Photographer | Photo |
| --- | --- | --- | --- |
| `POSES` | Standing | Minimalism | [1_19E6-l9ng](https://unsplash.com/photos/1_19E6-l9ng) |
| `POSES` | Sitting | otabek xatipov | [9uOc77HmX2c](https://unsplash.com/photos/9uOc77HmX2c) |
| `POSES` | Squat | SUNDAY II SUNDAY | [snM3yEpvklU](https://unsplash.com/photos/snM3yEpvklU) |
| `POSES` | Lying down | Julia Kutsenko | [_qEZIh54p7E](https://unsplash.com/photos/_qEZIh54p7E) |
| `POSES` | Jumping | Elvis Kaiser | [zwezx0wtdJE](https://unsplash.com/photos/zwezx0wtdJE) |
| `POSES` | Yoga | Alex Shaw | [kh9XApwKtm0](https://unsplash.com/photos/kh9XApwKtm0) |
| `POSES` | Running | Anna Stampfli | [tAc1Ylnsnx8](https://unsplash.com/photos/tAc1Ylnsnx8) |
| `POSES` | Sitting group | Vitaly Gariev | [Kg7smnC1F0o](https://unsplash.com/photos/Kg7smnC1F0o) |
| `POSES` | Headshot | Aiony Haust | [3TLl_97HNJo](https://unsplash.com/photos/3TLl_97HNJo) |
| `FACES` | One face | Jota Lao | [MphctUUI9vA](https://unsplash.com/photos/MphctUUI9vA) |
| `FACES` | Group | Tim Mossholder | [hOF1bWoet_Q](https://unsplash.com/photos/hOF1bWoet_Q) |
| `FACES` | Big group | Omar Lopez | [T6zu4jFhVwg](https://unsplash.com/photos/T6zu4jFhVwg) |
| `FACES` | Crowd | CHUTTERSNAP | [gDDas5_ALRw](https://unsplash.com/photos/gDDas5_ALRw) |
| `FACES` | Profile | Elise Wilcox | [11wyfUbiiEQ](https://unsplash.com/photos/11wyfUbiiEQ) |
| `FACES` | Eyes closed | Fanny Gustafsson | [G0oxf0bjrB8](https://unsplash.com/photos/G0oxf0bjrB8) |
| `FACES` | Smile | Marcus Lewis | [7jCQyO6X_FA](https://unsplash.com/photos/7jCQyO6X_FA) |
| `FACES` | Sunglasses | Mike Cox | [u70NAyHIbcE](https://unsplash.com/photos/u70NAyHIbcE) |
| `FACES` | From behind | Blake Cheek | [_upIc3o7WWU](https://unsplash.com/photos/_upIc3o7WWU) |
| `PEOPLE` | Busy background | Anurag Jamwal | [byEQg6_81g0](https://unsplash.com/photos/byEQg6_81g0) |
| `PEOPLE` | Backlit hair | maks_d | [wW9EWpUJgCE](https://unsplash.com/photos/wW9EWpUJgCE) |
| `PEOPLE` | Several people | Tim Mossholder | [hOF1bWoet_Q](https://unsplash.com/photos/hOF1bWoet_Q) |
| `PEOPLE` | Empty room | Point3D Commercial Imaging Ltd. | [nQlVMCHPysY](https://unsplash.com/photos/nQlVMCHPysY) |
| `SUBJECTS` | Plant | Annie Spratt | [RDE59yq9pRw](https://unsplash.com/photos/RDE59yq9pRw) |
| `SUBJECTS` | Bicycle | Abhishek Ravi | [czNXupVwHdU](https://unsplash.com/photos/czNXupVwHdU) |
| `SUBJECTS` | Dog | Refracted Moments | [m_vSSOVXomA](https://unsplash.com/photos/m_vSSOVXomA) |
| `SUBJECTS` | Cluttered desk | engin akyurt | [WC1pqONQ3Bg](https://unsplash.com/photos/WC1pqONQ3Bg) |
| `OBJECTS` | Desk | engin akyurt | [WC1pqONQ3Bg](https://unsplash.com/photos/WC1pqONQ3Bg) |
| `OBJECTS` | Laid table | Peyman Shojaei | [ueqjc6WSoRg](https://unsplash.com/photos/ueqjc6WSoRg) |
| `OBJECTS` | Bread | Gideon Karanja | [uf7Q9WLbwvw](https://unsplash.com/photos/uf7Q9WLbwvw) |
| `OBJECTS` | Flat lay | Sincerely Media | [CgtKLEJD1G8](https://unsplash.com/photos/CgtKLEJD1G8) |
| `OBJECTS` | Street | Arthur Osipyan | [vLusIJAYy_Q](https://unsplash.com/photos/vLusIJAYy_Q) |
| `OBJECTS` | Texture | Wolfgang Vrede | [N9G7mNKGlXw](https://unsplash.com/photos/N9G7mNKGlXw) |
| `SCENES` | Beach | Pedro Monteiro | [HfIex7qwTlI](https://unsplash.com/photos/HfIex7qwTlI) |
| `SCENES` | Dog | Refracted Moments | [m_vSSOVXomA](https://unsplash.com/photos/m_vSSOVXomA) |
| `SCENES` | Bread | Gideon Karanja | [uf7Q9WLbwvw](https://unsplash.com/photos/uf7Q9WLbwvw) |
| `SCENES` | Street | Arthur Osipyan | [vLusIJAYy_Q](https://unsplash.com/photos/vLusIJAYy_Q) |
| `SCENES` | Bicycle | Abhishek Ravi | [czNXupVwHdU](https://unsplash.com/photos/czNXupVwHdU) |
| `SCENES` | Picnic | Vitaly Gariev | [Kg7smnC1F0o](https://unsplash.com/photos/Kg7smnC1F0o) |
| `SCENES` | Texture | Wolfgang Vrede | [N9G7mNKGlXw](https://unsplash.com/photos/N9G7mNKGlXw) |
| `TEXTS` | Street sign | Tim Mossholder | [DKPeN_sNVMs](https://unsplash.com/photos/DKPeN_sNVMs) |
| `TEXTS` | Many signs | Tim Mossholder | [f-XdL4pPUVw](https://unsplash.com/photos/f-XdL4pPUVw) |
| `TEXTS` | Book page | Tim Wildsmith | [94e9pQUBgT8](https://unsplash.com/photos/94e9pQUBgT8) |
| `TEXTS` | Price list | Croissant | [QIXmEEzgu-M](https://unsplash.com/photos/QIXmEEzgu-M) |
| `TEXTS` | Chalkboard | JL Merilles | [39GSKPrdTvM](https://unsplash.com/photos/39GSKPrdTvM) |
| `TEXTS` | Handwriting | Annie Spratt | [_D4xeSk6fLg](https://unsplash.com/photos/_D4xeSk6fLg) |
| `TEXTS` | Licence plate | nicola dowie | [kPOBoFmoAMA](https://unsplash.com/photos/kPOBoFmoAMA) |
| `TEXTS` | Perspective | Annie Spratt | [W_Tk9l-YORQ](https://unsplash.com/photos/W_Tk9l-YORQ) |
| `TEXTS` | Korean + Latin | lee seunghyub | [ZZhporQX_R8](https://unsplash.com/photos/ZZhporQX_R8) |
| `TEXTS` | Japanese | ayumi kubo | [Tz1DlovF6hI](https://unsplash.com/photos/Tz1DlovF6hI) |
| `CODES` | Many QR | Toa Heftiba | [EvrEmGwPQ98](https://unsplash.com/photos/EvrEmGwPQ98) |
| `CODES` | QR on screen | Marielle Ursua | [Ip0ZmJZaL8c](https://unsplash.com/photos/Ip0ZmJZaL8c) |

The 40 benchmark photos come from the same Unsplash searches; their ids are
in the `BENCH` array in [`src/samples.ts`](src/samples.ts).
