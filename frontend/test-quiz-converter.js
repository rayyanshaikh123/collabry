// Test the quiz converter with the exact format from the user

const testInput = `1. What is the time complexity of searching an element in a hash table using chaining?
A) O(1)
B) O(n)
C) O(log n)
D) O(sqrt n)

Answer: B) O(n)
Explanation: When using chaining, the average case time complexity for search operation is O(n), where n is the load factor of the hash table.

2. Which data structure is suitable for implementing a priority queue?
A) Stack
B) Queue
C) Heap
D) Tree

Answer: C) Heap
Explanation: A heap is a specialized tree-based data structure that satisfies the heap property, making it ideal for priority queues.

3. What is the time complexity of inserting an element into a balanced binary search tree?
A) O(1)
B) O(n)
C) O(log n)
D) O(sqrt n)

Answer: C) O(log n)
Explanation: The insertion operation in a self-balancing binary search tree, like AVL or Red-Black trees, has an average time complexity of O(log n).`;

// Simulate the converter function
function convertLegacyToJSON(text) {
  const questions = [];
  
  // Split by question number patterns
  const parts = text.split(/(?=\d+\.\s+[A-Z])/gm);
  
  console.log('Split into', parts.length, 'parts');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed.length < 20) continue;
    
    console.log('\n--- Processing block ---');
    console.log('First 100 chars:', trimmed.substring(0, 100));
    
    // Extract question (everything before first "A)")
    const questionMatch = trimmed.match(/^\d+\.\s+(.+?)(?=\nA\))/s);
    if (!questionMatch) {
      console.log('❌ No question found');
      continue;
    }
    
    const question = questionMatch[1].trim();
    console.log('✅ Question:', question.substring(0, 50) + '...');
    
    // Extract options (but NOT from Answer: line)
    const options = [];
    // Split text before "Answer:" to avoid matching it
    const beforeAnswer = trimmed.split(/\nAnswer:/)[0];
    const optionRegex = /([A-D])\)\s*(.+?)(?=\n[A-D]\)|$)/gs;
    let match;
    
    while ((match = optionRegex.exec(beforeAnswer)) !== null) {
      const optionText = match[2].trim();
      if (optionText) {
        options.push(optionText);
        console.log(`  Option ${match[1]}: ${optionText}`);
      }
    }
    
    // Extract answer
    const answerMatch = trimmed.match(/Answer:\s*([A-D])\)/i);
    if (!answerMatch) {
      console.log('❌ No answer found');
      continue;
    }
    
    const correctAnswer = answerMatch[1].toUpperCase().charCodeAt(0) - 65;
    console.log('✅ Correct answer:', answerMatch[1], '(index:', correctAnswer + ')');
    
    // Extract explanation
    const explanationMatch = trimmed.match(/Explanation:\s*(.+?)(?=\n\d+\.|$)/s);
    const explanation = explanationMatch ? explanationMatch[1].trim() : '';
    console.log('✅ Explanation:', explanation.substring(0, 50) + '...');
    
    if (question && options.length === 4) {
      questions.push({
        question,
        options,
        correctAnswer,
        explanation
      });
      console.log('✅ Question added successfully!');
    }
  }
  
  return questions.length > 0 ? JSON.stringify(questions, null, 2) : null;
}

const result = convertLegacyToJSON(testInput);

console.log('\n========================================');
console.log('FINAL RESULT:');
console.log('========================================');
if (result) {
  console.log(result);
  const parsed = JSON.parse(result);
  console.log('\n✅ Successfully converted', parsed.length, 'questions');
} else {
  console.log('❌ Conversion failed');
}
