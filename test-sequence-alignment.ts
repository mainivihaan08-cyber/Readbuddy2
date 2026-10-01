import { analyzeSpokenText, normalizeForCompare } from './src/services/soundAnalysis';
import { analyzeSpeech } from './src/services/speechAnalyzer';

async function runTests() {
  console.log('=== RUNNING SEQUENCE ALIGNMENT & NOT-HEARD TESTS ===\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✕ FAIL: ${testName}`, detail || '');
    }
  }

  // TEST 1: The exact problem statement:
  // "little frog leap across the river" where "leap" is dropped (heard: "little frog across the river")
  const expectedText1 = "little frog leap across the river";
  const heardText1 = "little frog across the river";
  const analysis1 = analyzeSpokenText(expectedText1, heardText1, 'en');

  console.log('Test 1 Alignment Output:', analysis1.map(w => `${w.expected}: ${w.status} (${w.alignmentType})`));

  assert(analysis1[0].expected === 'little' && analysis1[0].status === 'correct', 'Test 1.1: "little" is correct');
  assert(analysis1[1].expected === 'frog' && analysis1[1].status === 'correct', 'Test 1.2: "frog" is correct');
  assert(analysis1[2].expected === 'leap' && analysis1[2].status === 'not-heard', 'Test 1.3: "leap" is not-heard (amber)');
  assert(analysis1[2].detectedSubstitution === undefined, 'Test 1.4: "leap" has NO substitution logged');
  assert(analysis1[3].expected === 'across' && analysis1[3].status === 'correct', 'Test 1.5: "across" remains correct (NOT shifted)');
  assert(analysis1[4].expected === 'the' && analysis1[4].status === 'correct', 'Test 1.6: "the" is correct');
  assert(analysis1[5].expected === 'river' && analysis1[5].status === 'correct', 'Test 1.7: "river" is correct');

  // TEST 2: Speech Clarity score when 1 word is not-heard
  const speechRes1 = await analyzeSpeech({
    targetText: expectedText1,
    recognizedText: heardText1,
    language: 'en',
    exerciseType: 'line',
    speechDetected: true,
    totalResultsReceived: 5,
  });

  assert(speechRes1.clarityScore === 100, 'Test 2.1: Clarity is 100% (5 correct / 5 heard)');
  assert(speechRes1.notHeardCount === 1, 'Test 2.2: notHeardCount is 1');
  assert(speechRes1.identifiedSubstitutions.length === 0, 'Test 2.3: No weak-sound substitutions logged for not-heard word');

  // TEST 3: Digits normalization ("3" -> "three")
  const norm3 = normalizeForCompare("3", "en");
  assert(norm3 === 'three', 'Test 3.1: normalizeForCompare("3") === "three"');
  const analysisDigits = analyzeSpokenText("3 little birds", "three little birds", 'en');
  assert(analysisDigits[0].status === 'correct', 'Test 3.2: "3" matches "three" as correct');

  // TEST 4: Homophones normalization ("won" -> "one", "to/too" -> "two", "for" -> "four", "ate" -> "eight")
  assert(normalizeForCompare("won", "en") === 'one', 'Test 4.1: won -> one');
  assert(normalizeForCompare("too", "en") === 'two', 'Test 4.2: too -> two');
  assert(normalizeForCompare("for", "en") === 'four', 'Test 4.3: for -> four');
  assert(normalizeForCompare("ate", "en") === 'eight', 'Test 4.4: ate -> eight');

  const analysisHomophones = analyzeSpokenText("I have two apples and one pear", "I have too apples and won pear", 'en');
  assert(analysisHomophones[2].status === 'correct', 'Test 4.5: "two" matches "too"');
  assert(analysisHomophones[5].status === 'correct', 'Test 4.6: "one" matches "won"');

  // TEST 5: Articulation substitution ("wabbit" for "rabbit")
  const analysisSub = analyzeSpokenText("the white rabbit hops", "the white wabbit hops", 'en');
  assert(analysisSub[2].expected === 'rabbit' && analysisSub[2].status === 'needs-practice', 'Test 5.1: "rabbit" marked needs-practice');
  assert(analysisSub[2].detectedSubstitution?.expectedSound === 'r' && analysisSub[2].detectedSubstitution?.spokenSound === 'w', 'Test 5.2: detectedSubstitution r -> w');
  assert(analysisSub[3].expected === 'hops' && analysisSub[3].status === 'correct', 'Test 5.3: subsequent word "hops" remains correct');

  // TEST 6: Live listening trailing words stay pending
  const liveAnalysis = analyzeSpokenText("the quick brown fox jumps", "the quick", 'en', {}, true);
  assert(liveAnalysis[0].status === 'correct', 'Test 6.1: live "the" correct');
  assert(liveAnalysis[1].status === 'correct', 'Test 6.2: live "quick" correct');
  assert(liveAnalysis[2].status === 'pending', 'Test 6.3: live "brown" pending');
  assert(liveAnalysis[3].status === 'pending', 'Test 6.4: live "fox" pending');
  assert(liveAnalysis[4].status === 'pending', 'Test 6.5: live "jumps" pending');

  console.log(`\n=== TEST SUITE COMPLETED: ${passed}/${total} PASSED ===`);
}

runTests().catch(console.error);
