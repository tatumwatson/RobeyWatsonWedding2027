// ---------------------------------------------------------------
// Single source of truth for your event details. Both the Schedule
// page and the personalized RSVP-download PDF pull from this file,
// so you only ever need to update times/locations/descriptions here.
// "intro" is an optional line shown above an event on the Schedule page.
// ---------------------------------------------------------------
window.WEDDING_EVENTS = [
  {
    key: "thu_night_before",
    label: "The Night Before",
    day: "Thursday",
    time: "[Time]",
    location: "[Location]",
    description: "[Brief description — what it is, what to expect, attire if different from the rest of the weekend.]",
  },
  {
    key: "fri_reception_day",
    label: "Reception Day",
    day: "Friday",
    time: "[Time]",
    location: "[Location]",
    description: "[Brief description of the daytime Friday activity.]",
  },
  {
    key: "fri_reception_party",
    label: "Reception Party",
    day: "Friday",
    time: "[Time]",
    location: "[Location]",
    description: "[Brief description of the Friday evening event.]",
    intro: "Come celebrate with us!",
  },
  {
    key: "sat_day_after",
    label: "The Day After",
    day: "Saturday",
    time: "[Time]",
    location: "[Location]",
    description: "[Brief description — ceremony, celebration, or recovery day, whichever this is.]",
    intro: "Not ready for the party to end? Neither are we!",
  },
  {
    key: "sun_brunch",
    label: "Mother's Day Brunch",
    day: "Sunday",
    time: "[Time]",
    location: "[Location]",
    description: "[Brief description of the closing brunch.]",
  },
];
