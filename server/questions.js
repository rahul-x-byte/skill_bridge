// Question bank for skill assessments. `a` = index of the correct option.
module.exports = {
  JavaScript: [
    { q: 'Which keyword declares a block-scoped variable?', o: ['var', 'let', 'def', 'dim'], a: 1 },
    { q: 'What does "===" check?', o: ['Value only', 'Type only', 'Value and type', 'Reference only'], a: 2 },
    { q: 'Which method adds an item to the end of an array?', o: ['push()', 'pop()', 'shift()', 'concat()'], a: 0 }
  ],
  Python: [
    { q: 'Which of these is a mutable type?', o: ['tuple', 'str', 'list', 'int'], a: 2 },
    { q: 'What does len([1, 2, 3]) return?', o: ['2', '3', '4', 'Error'], a: 1 },
    { q: 'Which keyword defines a function?', o: ['func', 'function', 'def', 'fn'], a: 2 }
  ],
  SQL: [
    { q: 'Which clause filters rows?', o: ['ORDER BY', 'GROUP BY', 'WHERE', 'LIMIT'], a: 2 },
    { q: 'Which JOIN returns only matching rows from both tables?', o: ['LEFT', 'INNER', 'FULL', 'CROSS'], a: 1 },
    { q: 'Which function counts rows?', o: ['SUM()', 'COUNT()', 'AVG()', 'MAX()'], a: 1 }
  ],
  React: [
    { q: 'Which hook manages local component state?', o: ['useEffect', 'useRef', 'useState', 'useMemo'], a: 2 },
    { q: 'What is JSX?', o: ['A database', 'JavaScript syntax extension', 'A CSS tool', 'A server'], a: 1 },
    { q: 'Props are...', o: ['Read-only inputs', 'Global state', 'Server data', 'CSS rules'], a: 0 }
  ]
};
