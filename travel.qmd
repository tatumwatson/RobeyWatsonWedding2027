// ---------------------------------------------------------------
// Both the Schedule page and the personalized RSVP-download PDF pull from this file,
// only ever need to update times and descriptions here.
// "intro" is line shown above an event on the Schedule page.
// "details" is list of label and value rows shown inside the box.
// "end" is only used for the Add to Calendar file. It is not shown on the site.
// "cardDesc" is the short line printed on each schedule card in the RSVP PDF. The cards
// are drawn from this file when the site is published (see _build/card.html).
// ---------------------------------------------------------------
window.WEDDING_YEAR = 2027;
window.WEDDING_MONTH = 5; // 5 = May
window.WEDDING_EVENTS = [
  {
    key: "thu_night_before",
    label: "The Night Before",
    day: "Thursday",
    date: "6th",
    time: "4:00 PM",
    end: "9:00 PM",
    description: "Thank you for staying with us at the Lodge! Check in is at 4pm, and we will be getting set up, eating some dinner, and hanging out before the big day.",
    cardDesc: "Check in at the Lodge, get settled, eat dinner, and hang out before the big day.",
  },
  {
    key: "fri_reception_party",
    label: "Reception",
    day: "Friday",
    date: "7th",
    time: "5:00 PM",
    end: "11:59 PM",
    description: "Come hungry for dinner, s'mores, and dancing.",
    cardDesc: "Come hungry for dinner, s'mores, and dancing. The party winds down when we do.",
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
    end: "8:00 PM",
    description: "A laid-back field day with games, movies, and good company. Come and go as you like.",
    cardDesc: "A laid-back field day with games, movies, and good company. Come and go as you like.",
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
    end: "1:30 PM",
    description: "Please joining us in celebrating all the mothers in our lives. After checkout, we will head in town to [make reservation] to enjoy a Mother's Day brunch before everyone heads home.",
    cardDesc: "Celebrate all the mothers in our lives over brunch in town before everyone heads home.",
  },
];

// ---------------------------------------------------------------
// "Good to know" section of the RSVP PDF. The PDF shows it as styled cards drawn
// when the site is published (see _build/good_to_know.html). If those cards are
// missing, the PDF falls back to plain text built from the same words.
// ---------------------------------------------------------------
window.WEDDING_GOOD_TO_KNOW = {
  getting: [
    "The Legacy Lodge is about a 2 1/2 hour drive from both Phoenix Sky Harbor and Flagstaff Pulliam Airport.",
    "Cell service can be spotty in the mountains. Please download your directions for offline use before you leave.",
    "There is no shuttle, and rideshare is largely unavailable. We recommend renting a car.",
  ],
  parkHere: [
    "Outside the gate, without blocking the road or entrance",
    "Inside the gate, along the outer fence",
  ],
  parkNot: [
    "Park on the grass",
    "Park on or block the caretaker's drive",
    "Connect RVs to the lodge. This is strictly prohibited.",
  ],
  parkNote: "Parking and no parking signs are posted throughout the property.",
  weather:
    "Typical May weather in Heber is a high of 72°F and a low of 43°F.",
};
