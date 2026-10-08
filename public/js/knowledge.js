/* MindSpark — offline topic library. Works with zero internet.
   Every topic follows the same schema the AI generator returns, so pages treat them identically. */
const KB = [
{
  id: 'photosynthesis', title: 'Photosynthesis', emoji: '🌿', subject: 'Biology',
  aliases: ['photosynthesis', 'photo synthesis', 'plants make food', 'plant food', 'chlorophyll', 'chloroplast'],
  hook: 'Every breath you take was made by something green. Plants are solar-powered food factories, and they have been running for billions of years without a single power cut.',
  funFact: 'Roughly half of the oxygen on Earth comes from tiny plankton floating in the ocean, not from forests.',
  simple: [
    'Photosynthesis is how green plants make their own food using sunlight.',
    'They take in **carbon dioxide** from the air and **water** from the soil. Using energy from sunlight, captured by a green pigment called **chlorophyll**, they turn these into **glucose** (sugar) and release **oxygen**.'
  ],
  deep: [
    'It happens inside chloroplasts in two stages. The **light-dependent reactions** (in the thylakoid membranes) capture light energy, split water molecules, release oxygen, and produce the energy carriers ATP and NADPH.',
    'The **light-independent reactions**, called the **Calvin cycle** (in the stroma), use that ATP and NADPH to fix CO₂ into glucose. Overall: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂.'
  ],
  story: 'Inside every leaf is a tiny kitchen called the Chloroplast Café. The chef, Chlorophyll, is bright green and loves sunshine.\n\nEvery morning, delivery pipes bring water up from the roots, and little windows on the leaf (the stomata) let carbon dioxide drift in. Chef Chlorophyll catches sunlight like a solar panel and uses that energy to cook water and CO₂ into sweet glucose — food for the whole plant.\n\nThe leftover steam from the kitchen? Fresh oxygen, pushed out through the windows for us to breathe.',
  steps: [
    'Roots absorb water from the soil; it travels up the stem to the leaves.',
    'Tiny pores called stomata let carbon dioxide into the leaf.',
    'Chlorophyll inside the chloroplasts absorbs sunlight.',
    'Light energy splits water molecules, releasing oxygen.',
    'That energy is used to build glucose from CO₂ (the Calvin cycle).',
    'Glucose feeds the plant; oxygen leaves through the stomata.'
  ],
  diagram: ['☀️ Sunlight', '🌿 Chlorophyll catches energy', '💧 Water + CO₂ go in', '🍬 Glucose is made', '🫧 Oxygen comes out'],
  activity: 'Put a fresh leaf, or a small piece of water plant, in a clear glass of water. Leave it in bright sunlight for 30–60 minutes.\n\nLook closely: the tiny bubbles forming on the leaf are oxygen being released. Put a second glass in the shade and compare — fewer bubbles means less light, less photosynthesis.',
  realLife: [
    'All the food you eat traces back to photosynthesis — even meat, because animals eat plants.',
    'Coal and petrol are ancient stored sunlight from plants that photosynthesised millions of years ago.',
    'Scientists are building "artificial leaves" that copy photosynthesis to make clean fuel.'
  ],
  keyTerms: { 'Chlorophyll': 'Green pigment that absorbs light energy.', 'Chloroplast': 'The part of a plant cell where photosynthesis happens.', 'Stomata': 'Tiny pores on leaves that let gases in and out.', 'Glucose': 'The sugar plants make as food.', 'Calvin cycle': 'The stage that turns CO₂ into glucose.' },
  eli5: {
    simple: 'Plants are chefs who cook their own food. Their ingredients are water and air, their stove is the sun, the meal is sugar, and the leftover is the oxygen we breathe.',
    deep: 'Think of a factory with two shifts. Shift 1 (light reactions) charges up batteries using sunlight and lets out oxygen. Shift 2 (Calvin cycle) uses those charged batteries to build sugar out of CO₂.',
    story: 'Leaf = kitchen. Sun = stove. Water + air = ingredients. Sugar = the meal. Oxygen = the steam coming out.',
    steps: 'Water comes in from the roots, air comes in through leaf holes, the green stuff catches sunlight, sugar gets made, oxygen goes out. That is the whole thing.',
    diagram: 'Follow the arrows: the sun gives energy → the green part catches it → it mixes water and air → that makes sugar → oxygen is released.',
    activity: 'Just watch for bubbles on a leaf in sunny water. Bubbles = oxygen = photosynthesis happening live.'
  },
  challenge: 'Plants make oxygen during the day — so why do they also need oxygen and do respiration, especially at night? Think about what the plant actually does with its glucose.',
  examTips: ['Learn the balanced equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (needs light + chlorophyll).', 'Know where each stage happens: light reactions in thylakoids, Calvin cycle in stroma.', 'The oxygen released comes from WATER, not from CO₂ — a favourite exam trick.'],
  quiz: [
    { q: 'Which gas do plants take in for photosynthesis?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], answer: 1, explain: 'Plants absorb carbon dioxide through their stomata and use it to build glucose.', level: 1 },
    { q: 'Which pigment absorbs sunlight in plants?', options: ['Melanin', 'Haemoglobin', 'Chlorophyll', 'Keratin'], answer: 2, explain: 'Chlorophyll is the green pigment that captures light energy.', level: 1 },
    { q: 'What is the main food made by photosynthesis?', options: ['Protein', 'Glucose', 'Fat', 'Starch only'], answer: 1, explain: 'Glucose is the sugar made directly; plants can later store it as starch.', level: 1 },
    { q: 'Where in the plant cell does photosynthesis take place?', options: ['Nucleus', 'Mitochondria', 'Chloroplast', 'Cell wall'], answer: 2, explain: 'Chloroplasts contain chlorophyll and are the site of photosynthesis.', level: 2 },
    { q: 'What are stomata?', options: ['Root hairs', 'Tiny pores for gas exchange', 'Seeds', 'Green pigments'], answer: 1, explain: 'Stomata are tiny pores, mostly on leaves, that let CO₂ in and oxygen out.', level: 2 },
    { q: 'Which stage uses CO₂ to build glucose?', options: ['Light reactions', 'Calvin cycle', 'Glycolysis', 'Transpiration'], answer: 1, explain: 'The Calvin cycle (light-independent reactions) fixes CO₂ into sugar.', level: 2 },
    { q: 'The oxygen released during photosynthesis comes from…', options: ['Carbon dioxide', 'Glucose', 'Water', 'Soil minerals'], answer: 2, explain: 'Water molecules are split in the light reactions, releasing their oxygen.', level: 3 },
    { q: 'What do the light reactions provide to the Calvin cycle?', options: ['ATP and NADPH', 'Oxygen and water', 'Glucose and CO₂', 'Chlorophyll'], answer: 0, explain: 'ATP and NADPH are the energy carriers that power sugar-building in the Calvin cycle.', level: 3 }
  ]
},
{
  id: 'fractions', title: 'Fractions', emoji: '🍕', subject: 'Maths',
  aliases: ['fraction', 'fractions', 'numerator', 'denominator', 'equivalent fraction'],
  hook: 'If you have ever split a pizza fairly, you already understand fractions. Today we just give your pizza skills their official names.',
  funFact: 'Ancient Egyptians wrote almost every fraction as a sum of "one-over" fractions, like 1/2 + 1/4 — over 3,500 years ago.',
  simple: [
    'A fraction shows a **part of a whole**. It is written as numerator/denominator, like 3/4.',
    'The **denominator** (bottom) tells you how many equal parts the whole is cut into. The **numerator** (top) tells you how many of those parts you have. So 3/4 means 3 out of 4 equal parts.'
  ],
  deep: [
    '**Equivalent fractions** name the same amount: 1/2 = 2/4 = 4/8. You get them by multiplying or dividing the top and bottom by the same number. A fraction is in **simplest form** when top and bottom share no common factor except 1.',
    'To add or subtract, you need a **common denominator**: 1/3 + 1/4 = 4/12 + 3/12 = 7/12. To multiply, multiply tops and bottoms: 2/3 × 3/5 = 6/15 = 2/5. To divide, flip the second fraction and multiply.'
  ],
  story: 'Riya orders a pizza cut into 8 slices for herself and three friends. Each person grabs 2 slices — that is 2/8 each, which is the same as 1/4 of the pizza.\n\nThen her little brother walks in looking sad. Riya gives him one of her two slices. Now she has 1/8 and he has 1/8.\n\nAt the end, all 8 slices are gone: 8/8 = 1 whole pizza. Fractions were just slices all along.',
  steps: [
    'Look at the denominator: how many equal parts is the whole cut into?',
    'Look at the numerator: how many of those parts do you have?',
    'To compare or add, make the denominators the same (find a common multiple).',
    'Add or subtract only the numerators; keep the denominator.',
    'Simplify by dividing top and bottom by their greatest common factor.'
  ],
  diagram: ['🍕 1 whole pizza', '✂️ Cut into 4 equal parts', '🍕🍕🍕 Take 3 parts', '= 3/4', '= 6/8 (same amount)'],
  activity: 'Take a sheet of paper. Fold it in half and shade one half: that is 1/2.\n\nFold it in half again and open it — now there are 4 parts and your shading covers 2 of them: 2/4. Fold once more: 4/8. Same shading, different names. You just discovered equivalent fractions.',
  realLife: ['Recipes: 3/4 cup of flour, 1/2 teaspoon of salt.', 'Discounts: "25% off" means you pay 3/4 of the price.', 'Time: "quarter past" is 1/4 of an hour, or 15 minutes.'],
  keyTerms: { 'Numerator': 'Top number — how many parts you have.', 'Denominator': 'Bottom number — how many equal parts make the whole.', 'Equivalent fractions': 'Different-looking fractions with the same value, like 1/2 and 2/4.', 'Simplest form': 'When top and bottom share no common factor except 1.', 'Common denominator': 'A shared bottom number that lets you add or compare fractions.' },
  eli5: {
    simple: 'Cut a chocolate bar into 4 same-size pieces and eat 3. You ate 3/4. Bottom number = total pieces, top number = pieces you got.',
    deep: 'Before adding fractions, make the pieces the same size. You cannot easily add a half-slice and a third-slice — so cut both into twelfths first, then just count pieces.',
    story: 'Pizza! The slices in the box are the bottom number; the slices on your plate are the top number.',
    steps: 'Count total pieces (bottom). Count your pieces (top). Make pieces the same size before adding. Simplify at the end.',
    diagram: 'One pizza → cut into 4 → take 3 → that is 3/4.',
    activity: 'Every time you fold the paper, both numbers double, but the shaded area stays exactly the same.'
  },
  challenge: 'Which is bigger: 5/8 or 3/5? Solve it without a calculator, then find a trick that works for any two fractions. (Hint: cross-multiply.)',
  examTips: ['Always give your final answer in simplest form.', 'Dividing? Keep, Change, Flip: keep the first, change ÷ to ×, flip the second.', 'Convert mixed numbers to improper fractions before multiplying or dividing.'],
  quiz: [
    { q: 'In the fraction 3/7, what is the denominator?', options: ['3', '7', '10', '21'], answer: 1, explain: 'The denominator is the bottom number: 7 equal parts make the whole.', level: 1 },
    { q: 'Which fraction is equal to one half?', options: ['2/3', '3/5', '4/8', '1/4'], answer: 2, explain: '4/8 simplifies to 1/2 (divide top and bottom by 4).', level: 1 },
    { q: 'A pizza has 8 slices and you eat 3. What fraction did you eat?', options: ['3/5', '5/8', '3/8', '8/3'], answer: 2, explain: '3 parts out of 8 equal parts = 3/8.', level: 1 },
    { q: 'What is 1/4 + 2/4?', options: ['3/8', '3/4', '2/4', '1/2'], answer: 1, explain: 'Same denominators: add the tops, keep the bottom. 1 + 2 = 3, so 3/4.', level: 2 },
    { q: 'What is 6/9 in simplest form?', options: ['2/3', '3/4', '1/3', '6/9'], answer: 0, explain: 'Divide top and bottom by 3: 6/9 = 2/3.', level: 2 },
    { q: 'What is 1/3 + 1/6?', options: ['2/9', '1/2', '2/6', '1/9'], answer: 1, explain: '1/3 = 2/6, so 2/6 + 1/6 = 3/6 = 1/2.', level: 2 },
    { q: 'What is 2/3 × 3/4?', options: ['5/7', '6/7', '1/2', '8/9'], answer: 2, explain: 'Multiply tops and bottoms: 6/12, which simplifies to 1/2.', level: 3 },
    { q: 'What is 3/4 ÷ 1/2?', options: ['3/8', '3/2', '1/2', '4/6'], answer: 1, explain: 'Keep, change, flip: 3/4 × 2/1 = 6/4 = 3/2.', level: 3 }
  ]
},
{
  id: 'newton', title: "Newton's Laws of Motion", emoji: '🚀', subject: 'Physics',
  aliases: ['newton', 'laws of motion', 'law of motion', 'inertia', 'f=ma', 'force and motion', 'motion'],
  hook: 'Why does your body lurch forward when a bus brakes hard? How does a rocket fly in space with nothing to push against? Three short laws explain all of it.',
  funFact: 'Newton published these laws in 1687 — and space agencies still use them today to plan spacecraft paths.',
  simple: [
    '**First law (inertia):** an object stays still, or keeps moving in a straight line at the same speed, unless a force acts on it.',
    '**Second law:** Force = mass × acceleration (F = ma). More force gives more acceleration; more mass gives less acceleration for the same force.',
    '**Third law:** for every action there is an equal and opposite reaction.'
  ],
  deep: [
    'Mass is a measure of **inertia** — how strongly an object resists changes to its motion. The first law only holds in inertial frames: viewpoints that are not themselves accelerating.',
    'F = ma uses the **net force**, the vector sum of all forces. If forces balance, acceleration is zero even if the object is moving. Third-law pairs act on **different objects**, which is why they never cancel each other out.'
  ],
  story: 'Arjun stands still on a skateboard holding a heavy school bag. He stays still — inertia (first law).\n\nHe throws the bag forward hard. The bag flies forward and Arjun rolls backward: action and reaction (third law).\n\nNext he throws a light tennis ball with the same push. The ball zooms off much faster than the bag did — less mass, more acceleration (second law). Three laws, one skateboard.',
  steps: [
    'Pick the object you are studying.',
    'List every force on it: gravity, pushes, pulls, friction, the floor pushing up.',
    'Add them up (with direction) to get the net force.',
    'Net force zero → no change in motion (first law).',
    'Otherwise, acceleration = net force ÷ mass (second law).',
    'Remember each force has a partner force acting on the other object (third law).'
  ],
  diagram: ['🧍 Object at rest', '👉 A force is applied', '⚡ It accelerates (F = ma)', '🔁 It pushes back equally', '🛑 Friction slows it down'],
  activity: 'Put a playing card on top of a glass and a coin on the card. Flick the card quickly sideways.\n\nThe coin drops straight into the glass instead of flying off — that is inertia. Then flick an empty bottle and a full bottle with the same force and feel how mass changes acceleration.',
  realLife: ['Seatbelts stop your body\'s inertia from throwing you forward when a car brakes.', 'Rockets push exhaust gas down; the gas pushes the rocket up.', 'An empty shopping trolley is easier to push than a full one: F = ma.'],
  keyTerms: { 'Inertia': 'An object\'s tendency to keep doing what it is doing.', 'Net force': 'The total of all forces acting on an object.', 'Acceleration': 'How quickly velocity changes.', 'Mass': 'Amount of matter; also how much an object resists acceleration.', 'Action–reaction pair': 'Two equal, opposite forces acting on two different objects.' },
  eli5: {
    simple: '1) Things are lazy — they keep doing whatever they were doing. 2) Push harder and things speed up more; heavy things need bigger pushes. 3) When you push something, it pushes you back.',
    deep: 'Only the total push matters. If two friends push a box equally from opposite sides, it does not move. And the push-back acts on YOU, not on the box, so the two never cancel.',
    story: 'Skateboard and bag: still at first (lazy), throw the bag → you roll back (push-back), the light ball flies faster than the heavy bag (heavy needs more push).',
    steps: 'Find all the pushes and pulls, add them up. Zero total = nothing changes. Not zero = it speeds up, slows down or turns.',
    diagram: 'Something sits still → you push → it moves → it pushes you back → friction slows it.',
    activity: 'Flick the card fast. The coin is "lazy" and stays where it is, so it falls into the glass.'
  },
  challenge: 'A horse pulls a cart. By the third law, the cart pulls back on the horse with an equal force. So how does anything ever move? Explain using the forces on the horse versus the forces on the cart.',
  examTips: ['Write F = ma with units: newtons = kg × m/s².', 'Third-law pairs act on DIFFERENT bodies — examiners love this trap.', 'Balanced forces do not mean "no motion"; they mean no CHANGE in motion.'],
  quiz: [
    { q: 'Which law is also called the law of inertia?', options: ['First law', 'Second law', 'Third law', 'Law of gravity'], answer: 0, explain: 'The first law says objects keep their state of motion unless a force acts — that is inertia.', level: 1 },
    { q: 'F = ma is Newton\'s…', options: ['First law', 'Second law', 'Third law', 'Fourth law'], answer: 1, explain: 'The second law links force, mass and acceleration.', level: 1 },
    { q: 'A rocket launching upward is the best example of which law?', options: ['First law', 'Second law', 'Third law', 'None'], answer: 2, explain: 'Exhaust is pushed down (action) and the rocket is pushed up (reaction).', level: 1 },
    { q: 'A 10 N force acts on a 2 kg object. What is its acceleration?', options: ['20 m/s²', '5 m/s²', '12 m/s²', '0.2 m/s²'], answer: 1, explain: 'a = F ÷ m = 10 ÷ 2 = 5 m/s².', level: 2 },
    { q: 'Why do passengers lurch forward when a bus brakes suddenly?', options: ['Gravity pulls them', 'Inertia keeps them moving', 'The bus pushes them', 'Air resistance'], answer: 1, explain: 'Their bodies tend to keep moving forward even as the bus slows — inertia.', level: 2 },
    { q: 'The same force pushes a 1 kg ball and a 5 kg ball. Which accelerates more?', options: ['The 5 kg ball', 'The 1 kg ball', 'Both equally', 'Neither moves'], answer: 1, explain: 'Less mass means more acceleration for the same force.', level: 2 },
    { q: 'A book rests on a table. What is the net force on it?', options: ['Its weight', 'Zero', 'Twice its weight', 'Impossible to tell'], answer: 1, explain: 'Gravity down and the table\'s push up balance out, so the net force is zero.', level: 3 },
    { q: 'Why don\'t action–reaction forces cancel each other out?', options: ['They are not equal', 'They act on different objects', 'One is always bigger', 'They act at different times'], answer: 1, explain: 'Each force in the pair acts on a different body, so they cannot cancel on one object.', level: 3 }
  ]
},
{
  id: 'loops', title: 'Loops in Python', emoji: '🔁', subject: 'Coding',
  aliases: ['loop', 'loops', 'python', 'for loop', 'while loop', 'coding', 'programming', 'iteration'],
  hook: 'Want to print "Hello" a thousand times? You could type it a thousand times… or write two lines of code. Loops are how programmers get lazy in the smartest possible way.',
  funFact: 'One of the first recorded computer "bugs" was an actual moth stuck inside a computer in 1947. Today, a classic bug is a loop that never stops.',
  simple: [
    'A **loop** repeats a block of code multiple times, so you do not have to write it again and again.',
    'Python has two main loops. A **for loop** repeats over a sequence, like a list or a range of numbers. A **while loop** repeats as long as a condition stays True.'
  ],
  deep: [
    '`for i in range(start, stop, step)` produces numbers from start up to, but not including, stop. You can also loop directly over lists, strings and dictionaries, and use `enumerate()` to get the index and the value together.',
    '`break` exits a loop immediately; `continue` skips to the next round. A while loop needs something inside it that eventually makes the condition False — otherwise you get an **infinite loop**. Loops can be nested, for example to walk through rows and columns of a grid.'
  ],
  story: 'Meera is a robot librarian. Her boss hands her a stack of 50 books: "For each book in this stack, stamp it." She knows exactly how many there are — that is a for loop.\n\nNext day: "While there are people in the queue, help the next person." She does not know how many will come — that is a while loop.\n\nOne day, nobody told her when the queue ends. She kept helping forever. That is an infinite loop.',
  steps: [
    'Decide: do you know how many times to repeat? Use for. Repeat until something changes? Use while.',
    'Write the header: `for item in sequence:` or `while condition:`',
    'Indent the code you want repeated underneath it.',
    'For while loops, change something inside so the condition eventually becomes False.',
    'Use `break` to stop early, or `continue` to skip one round.',
    'Test with small numbers first.'
  ],
  diagram: ['▶️ Start', '❓ Items left / condition True?', '✅ Yes → run the loop body', '🔁 Go back and check again', '⛔ No → leave the loop'],
  activity: 'Open any Python editor (even on a phone — an online editor or Pydroid works) and run:\n\n```\nfor i in range(1, 6):\n    print(i, "*" * i)\n```\n\nNow change the 6 to 10. Then make it count down with `range(5, 0, -1)`.',
  realLife: ['Chat apps loop through your messages to draw your chat list.', 'Games run a "game loop" that redraws the screen many times every second.', 'Data scientists loop through millions of rows to find patterns.'],
  keyTerms: { 'Iteration': 'One run through the loop body.', 'for loop': 'Repeats once for each item in a sequence.', 'while loop': 'Repeats as long as a condition is True.', 'range()': 'Makes a sequence of numbers; stops before the end value.', 'break': 'Exits the loop immediately.', 'Infinite loop': 'A loop whose condition never becomes False.' },
  eli5: {
    simple: 'A loop is like telling a friend "do this 10 times" instead of saying "do this" 10 separate times. for = you know how many times. while = keep going until something happens.',
    deep: 'range(5) counts 0,1,2,3,4 — it stops just before 5. break = "stop right now". continue = "skip this one, go to the next".',
    story: 'Robot librarian: for = stamp every book in the stack. while = help people while the queue is not empty. Forget to end the queue = stuck forever.',
    steps: 'Choose for or while, write the first line, indent what repeats, make sure it can stop.',
    diagram: 'Check → if yes, do the work → go back and check again → if no, leave.',
    activity: 'Run the star code. Each line prints one more star because i goes up by one every round.'
  },
  challenge: 'Write a loop that prints the numbers 1 to 50, but prints "Fizz" for multiples of 3, "Buzz" for multiples of 5, and "FizzBuzz" for multiples of both. (A classic interview question.)',
  examTips: ['range(5) gives 0,1,2,3,4 — it stops BEFORE 5.', 'Indentation decides what is inside the loop.', 'Trace loops by hand with a small table of variable values.'],
  quiz: [
    { q: 'Which loop keeps repeating as long as a condition is True?', options: ['for loop', 'while loop', 'if statement', 'def'], answer: 1, explain: 'A while loop checks its condition before every round.', level: 1 },
    { q: 'What numbers does range(3) produce?', options: ['1, 2, 3', '0, 1, 2', '0, 1, 2, 3', '3, 2, 1'], answer: 1, explain: 'range starts at 0 by default and stops before the end value.', level: 1 },
    { q: 'Which keyword exits a loop immediately?', options: ['stop', 'exit', 'break', 'continue'], answer: 2, explain: 'break ends the loop right away.', level: 1 },
    { q: 'What does `for i in range(2, 8, 2): print(i)` print?', options: ['2 4 6 8', '2 4 6', '2 3 4 5 6 7', '0 2 4 6'], answer: 1, explain: 'Start at 2, step by 2, stop before 8: 2, 4, 6.', level: 2 },
    { q: 'What does `continue` do inside a loop?', options: ['Ends the program', 'Exits the loop', 'Skips to the next round', 'Restarts from zero'], answer: 2, explain: 'continue skips the rest of the current round and moves to the next one.', level: 2 },
    { q: 'When does an infinite loop happen?', options: ['When the loop has no body', 'When the condition never becomes False', 'When you use range()', 'When you use break'], answer: 1, explain: 'If nothing ever makes the condition False, the loop never stops.', level: 2 },
    { q: 'After `total = 0` then `for n in [1, 2, 3]: total += n`, what is total?', options: ['3', '5', '6', '123'], answer: 2, explain: '0 + 1 + 2 + 3 = 6.', level: 3 },
    { q: 'How many times is "hi" printed by: for i in range(3): / for j in range(2): print("hi")', options: ['5', '3', '2', '6'], answer: 3, explain: 'The inner loop runs 2 times for each of the 3 outer rounds: 3 × 2 = 6.', level: 3 }
  ]
}
];

function matchTopic(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return null;
  return KB.find(k => k.id === t) || KB.find(k => k.title.toLowerCase() === t) || KB.find(k => k.aliases.some(a => t.includes(a))) || null;
}
if (typeof module !== "undefined") module.exports = { KB, matchTopic };
