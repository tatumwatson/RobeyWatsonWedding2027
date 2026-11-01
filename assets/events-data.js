// ---------------------------------------------------------------
// Single source of truth for event details everywhere on site. (Schedule
// page and the personalized RSVP-download PDF pull from this file),
// only ever need to update times and descriptions here.
// "intro" is the line shown above an event on the Schedule page, make decision on later.
// ---------------------------------------------------------------
window.WEDDING_EVENTS = [
  {
    key: "thu_night_before",
    label: "The Night Before",
    day: "Thursday",
    time: "[Time]",
    description: "[Brief description — what it is, what to expect, attire if different from the rest of the weekend.]",
  },
  {
    key: "fri_reception_day",
    label: "Reception Day",
    day: "Friday",
    time: "[Time]",
    description: "[Brief description of the daytime Friday activity.]",
  },
  {
    key: "fri_reception_party",
    label: "Reception Party",
    day: "Friday",
    time: "5:00 PM",
    description: "Come hungry for dinner, toasts, s'mores, and dancing. Dress is dressy casual, and a layer is a good idea since evenings in the pines get chilly. We'll keep the party going until we wind down.",
    intro: "Come celebrate with us!",
  },
  {
    key: "sat_day_after",
    label: "The Day After",
    day: "Saturday",
    time: "12:00 PM",
    description: "A laid-back field day with games, movies, and good company. Wear whatever feels comfortable, and bring a swimsuit if you want to try the pond's rope swing.",
    intro: "Not ready for the party to end? Neither are we!",
  },
  {
    key: "sun_brunch",
    label: "Mother's Day Brunch",
    day: "Sunday",
    time: "[Time]",
    description: "[Brief description of the closing brunch.]",
  },
];
