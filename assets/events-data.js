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
    description: "Check in is at 4pm. We'll be getting set up, eating some dinner, and hanging out before the big day.",
    cardDesc: "Check in at the lodge, get settled, eat dinner, and hang out before the big day.",
  },
  {
    key: "fri_reception_party",
    label: "The Reception",
    day: "Friday",
    date: "7th",
    time: "5:00 PM",
    end: "11:59 PM",
    description: "Come hungry for dinner, s'mores, and dancing.",
    cardDesc: "Come hungry for dinner, s'mores, and dancing. Leave whenever you are ready, and stay as long as you are having fun.",
    intro: "Let the party begin!",
    details: [
      { label: "Attire", value: "Dressy casual (Think sundresses, khakis or jeans, and summery polos" },
      { label: "Bring", value: "Shoes that are comfortable on grass" },
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
      { label: "Attire", value: "Wear whatever lets you move, play, and enjoy the day." },
      { label: "Bring", value: "A swimsuit if you plan on jumping in the pond" },
      { label: "Weather", value: "Rain or shine, we'll have plenty to do inside with movies, games, and billiards" },
    ],
  },
  {
    key: "sun_brunch",
    label: "The Mother's Day Brunch",
    day: "Sunday",
    date: "9th",
    time: "11:30 AM",
    end: "1:30 PM",
    description: "Please joining us in celebrating all the mothers in our lives. After checkout, we will head into town to enjoy a Mother's Day brunch before everyone heads home.",
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
    "There is no shuttle and rideshare is largely unavailable, we recommend renting a car.",
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
