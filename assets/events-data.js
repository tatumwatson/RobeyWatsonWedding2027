// ---------------------------------------------------------------
// Single source of truth for your event details. Both the Schedule
// page and the personalized RSVP-download PDF pull from this file,
// so you only ever need to update times and descriptions here.
// "intro" is an optional line shown above an event on the Schedule page.
// "details" is an optional list of label and value rows shown inside the box.
// ---------------------------------------------------------------
window.WEDDING_EVENTS = [
  {
    key: "thu_night_before",
    label: "The Night Before",
    day: "Thursday",
    date: "6th",
    time: "4:00 PM",
    description: "Thank you for staying with us at the Lodge! Check in is at 4pm, and we will be getting set up, eating some dinner, and hanging out before the big day.",
  },
  {
    key: "fri_reception_party",
    label: "Reception Party",
    day: "Friday",
    date: "7th",
    time: "5:00 PM",
    description: "Come hungry for dinner, s'mores, and dancing.",
    intro: "Let the party begin!",
    details: [
      { label: "Attire", value: "Sundresses, khakis or jeans, and short-sleeve summery polos" },
      { label: "Bring", value: "Layers, evenings in the mountains can get chilly" },
      { label: "Weather", value: "If the weather turns, we'll move the party inside" },
    ],
  },
  {
    key: "sat_day_after",
    label: "The Day After",
    day: "Saturday",
    date: "8th",
    time: "12:00 PM",
    description: "A laid-back field day with games, movies, and good company. Come and go as you like.",
    intro: "Not ready for the party to end? Neither are we!",
    details: [
      { label: "Attire", value: "Whatever's comfortable and easy to move in" },
      { label: "Bring", value: "A swimsuit if you plan on jumping in the pond" },
      { label: "Weather", value: "If the weather turns, we'll have movies, card games, billiards, and more fun inside" },
    ],
  },
  {
    key: "sun_brunch",
    label: "Mother's Day Brunch",
    day: "Sunday",
    date: "9th",
    time: "11:30 AM",
    description: "Please joining us in celebrating all the mothers in our lives. After checkout, we will head in town to [make reservation] to enjoy a Mother's Day brunch before everyone heads home.",
  },
];
