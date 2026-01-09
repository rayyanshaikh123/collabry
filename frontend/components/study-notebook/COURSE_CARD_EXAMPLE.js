// Example response format that the AI should return for course recommendations

// When user asks: "find best courses for arrays"
// AI should call web_search tool, then return:

{
  "tool": null,
  "answer": "I found some excellent courses on arrays and data structures! Here are the top recommendations:\n\n[Data Structures in Python](https://www.coursera.org/learn/data-structures-python) - Platform: Coursera | Rating: 4.7/5 | Price: Free\n\n[The Complete Data Structures Course](https://www.udemy.com/course/data-structures-course) - Platform: Udemy | Rating: 4.8/5 | Price: $49.99\n\n[Arrays and Algorithms Masterclass](https://www.edx.org/course/algorithms-data-structures) - Platform: edX | Rating: 4.9/5 | Price: Free\n\n[JavaScript Algorithms and Data Structures](https://www.youtube.com/playlist?list=PLqM7alHXFySHCXD7r1J0ky9Zg_GBB1dbk) - Platform: YouTube | Rating: 4.6/5 | Price: Free\n\nThese courses cover array fundamentals, operations, and algorithms. Would you like me to search for more advanced topics or specific programming languages?",
  "follow_up_questions": [
    "What specific array operations do you want to learn?",
    "Which programming language are you focusing on?",
    "Are you interested in algorithm complexity analysis?"
  ]
}

// The frontend will:
// 1. Parse the markdown links with "course|training|tutorial|certification" keywords
// 2. Extract platform, rating, price from the line
// 3. Display each as an interactive CourseCard component
// 4. Users can click the card to open the course URL in a new tab
