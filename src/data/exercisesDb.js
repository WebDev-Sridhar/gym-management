// Pre-built exercise library with default values.
// sets: number, reps: string (allows ranges like "8-12"), rest: string, notes: string

export const EXERCISES = [
  // ── Chest ──────────────────────────────────────────────────────────────────
  { name: 'Barbell Bench Press',     sets: 4, reps: '8-10',  rest: '90s',  notes: 'Keep elbows at 45°, chest up' },
  { name: 'Incline Bench Press',     sets: 4, reps: '8-10',  rest: '90s',  notes: 'Targets upper chest' },
  { name: 'Decline Bench Press',     sets: 3, reps: '10-12', rest: '75s',  notes: 'Targets lower chest' },
  { name: 'Dumbbell Bench Press',    sets: 4, reps: '10-12', rest: '75s',  notes: 'Greater range of motion than barbell' },
  { name: 'Incline Dumbbell Press',  sets: 3, reps: '10-12', rest: '75s',  notes: '' },
  { name: 'Dumbbell Flyes',          sets: 3, reps: '12-15', rest: '60s',  notes: 'Feel the stretch at the bottom' },
  { name: 'Cable Chest Flyes',       sets: 3, reps: '12-15', rest: '60s',  notes: 'Squeeze hard at peak contraction' },
  { name: 'Push-ups',                sets: 3, reps: '15-20', rest: '60s',  notes: 'Keep core tight throughout' },
  { name: 'Chest Dips',             sets: 3, reps: '10-12', rest: '75s',  notes: 'Lean forward to hit chest more' },
  { name: 'Pec Deck Machine',        sets: 3, reps: '12-15', rest: '60s',  notes: '' },
  { name: 'Cable Crossover',         sets: 3, reps: '12-15', rest: '60s',  notes: 'High to low for lower chest' },

  // ── Back ───────────────────────────────────────────────────────────────────
  { name: 'Deadlift',                sets: 4, reps: '5-6',   rest: '180s', notes: 'Keep spine neutral, brace core' },
  { name: 'Romanian Deadlift',       sets: 3, reps: '10-12', rest: '90s',  notes: 'Feel hamstrings stretch at bottom' },
  { name: 'Pull-ups',                sets: 4, reps: '6-10',  rest: '90s',  notes: 'Full dead hang at bottom' },
  { name: 'Chin-ups',               sets: 3, reps: '8-10',  rest: '90s',  notes: 'Supinated grip hits biceps more' },
  { name: 'Lat Pulldown',            sets: 4, reps: '10-12', rest: '75s',  notes: 'Pull to upper chest, lean slightly back' },
  { name: 'Seated Cable Row',        sets: 4, reps: '10-12', rest: '75s',  notes: 'Chest proud, pull to navel' },
  { name: 'Barbell Bent-Over Row',   sets: 4, reps: '8-10',  rest: '90s',  notes: 'Hinge at hips, bar to belly button' },
  { name: 'Dumbbell Single-Arm Row', sets: 3, reps: '10-12', rest: '60s',  notes: 'Support with non-working hand' },
  { name: 'T-Bar Row',               sets: 3, reps: '10-12', rest: '75s',  notes: '' },
  { name: 'Face Pulls',              sets: 3, reps: '15-20', rest: '60s',  notes: 'Pull to nose level, elbows flared' },
  { name: 'Straight-Arm Pulldown',   sets: 3, reps: '12-15', rest: '60s',  notes: 'Keep arms straight, feel lats' },

  // ── Shoulders ──────────────────────────────────────────────────────────────
  { name: 'Barbell Overhead Press',  sets: 4, reps: '6-8',   rest: '120s', notes: 'Keep core braced, do not arch lower back' },
  { name: 'Dumbbell Shoulder Press', sets: 4, reps: '10-12', rest: '75s',  notes: '' },
  { name: 'Arnold Press',            sets: 3, reps: '10-12', rest: '75s',  notes: 'Rotate palms as you press up' },
  { name: 'Lateral Raises',          sets: 4, reps: '12-15', rest: '60s',  notes: 'Lead with elbows, slight bend' },
  { name: 'Front Raises',            sets: 3, reps: '12-15', rest: '60s',  notes: 'Control the descent' },
  { name: 'Rear Delt Flyes',        sets: 3, reps: '15-20', rest: '60s',  notes: 'Hinge forward, squeeze rear delts' },
  { name: 'Cable Lateral Raises',    sets: 3, reps: '15-20', rest: '45s',  notes: '' },
  { name: 'Upright Row',             sets: 3, reps: '10-12', rest: '60s',  notes: 'Wide grip to reduce shoulder impingement' },
  { name: 'Barbell Shrugs',          sets: 4, reps: '12-15', rest: '60s',  notes: 'Hold at top for 1s' },

  // ── Biceps ─────────────────────────────────────────────────────────────────
  { name: 'Barbell Bicep Curl',      sets: 4, reps: '10-12', rest: '75s',  notes: 'No swinging, full range' },
  { name: 'Dumbbell Curl',           sets: 3, reps: '10-12', rest: '60s',  notes: 'Alternate arms or both together' },
  { name: 'Hammer Curl',             sets: 3, reps: '10-12', rest: '60s',  notes: 'Neutral grip, hits brachialis' },
  { name: 'Preacher Curl',           sets: 3, reps: '10-12', rest: '60s',  notes: 'Great for peak contraction' },
  { name: 'Incline Dumbbell Curl',   sets: 3, reps: '12-15', rest: '60s',  notes: 'Long head stretch at bottom' },
  { name: 'Cable Curl',              sets: 3, reps: '12-15', rest: '60s',  notes: '' },
  { name: 'Concentration Curl',      sets: 3, reps: '12-15', rest: '45s',  notes: 'Isolates bicep effectively' },

  // ── Triceps ────────────────────────────────────────────────────────────────
  { name: 'Close-Grip Bench Press',  sets: 4, reps: '8-10',  rest: '90s',  notes: 'Elbows in close to body' },
  { name: 'Tricep Pushdown',         sets: 4, reps: '12-15', rest: '60s',  notes: 'Keep elbows locked at sides' },
  { name: 'Overhead Tricep Extension',sets:3, reps: '10-12', rest: '60s',  notes: 'Stretch at bottom' },
  { name: 'Skull Crushers',          sets: 3, reps: '10-12', rest: '75s',  notes: 'Lower bar to forehead slowly' },
  { name: 'Tricep Dips',             sets: 3, reps: '10-15', rest: '75s',  notes: 'Keep body upright for triceps focus' },
  { name: 'Rope Pushdown',           sets: 3, reps: '12-15', rest: '60s',  notes: 'Spread rope at bottom' },
  { name: 'Diamond Push-ups',        sets: 3, reps: '12-15', rest: '60s',  notes: '' },

  // ── Legs ───────────────────────────────────────────────────────────────────
  { name: 'Barbell Squat',           sets: 4, reps: '6-8',   rest: '180s', notes: 'Break parallel, knees track toes' },
  { name: 'Front Squat',             sets: 3, reps: '6-8',   rest: '120s', notes: 'More quad dominant' },
  { name: 'Leg Press',               sets: 4, reps: '10-15', rest: '90s',  notes: 'Do not lock knees at top' },
  { name: 'Hack Squat',              sets: 3, reps: '10-12', rest: '90s',  notes: '' },
  { name: 'Lunges',                  sets: 3, reps: '12/leg', rest: '75s', notes: 'Step forward, knee to floor' },
  { name: 'Walking Lunges',          sets: 3, reps: '20/leg', rest: '75s', notes: '' },
  { name: 'Bulgarian Split Squat',   sets: 3, reps: '10/leg', rest: '90s', notes: 'Rear foot elevated' },
  { name: 'Leg Extension',           sets: 3, reps: '12-15', rest: '60s',  notes: 'Pause at top' },
  { name: 'Lying Leg Curl',          sets: 3, reps: '12-15', rest: '60s',  notes: '' },
  { name: 'Seated Leg Curl',         sets: 3, reps: '12-15', rest: '60s',  notes: '' },
  { name: 'Sumo Deadlift',           sets: 3, reps: '8-10',  rest: '120s', notes: 'Wide stance, toes angled out' },
  { name: 'Standing Calf Raises',    sets: 4, reps: '15-20', rest: '45s',  notes: 'Full range, pause at top' },
  { name: 'Seated Calf Raises',      sets: 3, reps: '15-20', rest: '45s',  notes: '' },
  { name: 'Hip Thrust',              sets: 4, reps: '10-12', rest: '75s',  notes: 'Drive through heels, squeeze glutes' },

  // ── Core ───────────────────────────────────────────────────────────────────
  { name: 'Plank',                   sets: 3, reps: '60s',   rest: '45s',  notes: 'Keep hips level, core tight' },
  { name: 'Side Plank',              sets: 3, reps: '45s/side',rest:'45s', notes: '' },
  { name: 'Crunches',                sets: 3, reps: '20-25', rest: '45s',  notes: '' },
  { name: 'Reverse Crunches',        sets: 3, reps: '15-20', rest: '45s',  notes: 'Tuck knees to chest' },
  { name: 'Leg Raises',              sets: 3, reps: '15-20', rest: '45s',  notes: 'Keep lower back on floor' },
  { name: 'Russian Twists',          sets: 3, reps: '20-30', rest: '45s',  notes: 'Add plate for resistance' },
  { name: 'Cable Crunches',          sets: 3, reps: '15-20', rest: '60s',  notes: 'Kneel, pull cable to knees' },
  { name: 'Ab Wheel Rollout',        sets: 3, reps: '10-12', rest: '60s',  notes: '' },
  { name: 'Mountain Climbers',       sets: 3, reps: '30s',   rest: '30s',  notes: 'Fast pace for cardio benefit' },
  { name: 'Hanging Leg Raises',      sets: 3, reps: '12-15', rest: '60s',  notes: '' },
  { name: 'Bicycle Crunches',        sets: 3, reps: '20-30', rest: '45s',  notes: '' },

  // ── Cardio ─────────────────────────────────────────────────────────────────
  { name: 'Treadmill Run',           sets: 1, reps: '20 min', rest: '—',   notes: 'Moderate pace' },
  { name: 'Incline Treadmill Walk',  sets: 1, reps: '30 min', rest: '—',   notes: 'Incline 8-12, brisk walk' },
  { name: 'Stationary Cycling',      sets: 1, reps: '20 min', rest: '—',   notes: 'RPE 6-7' },
  { name: 'Jump Rope',               sets: 5, reps: '2 min',  rest: '30s', notes: 'Great for conditioning' },
  { name: 'Box Jumps',               sets: 4, reps: '8-10',   rest: '60s', notes: 'Land softly, full hip extension' },
  { name: 'Burpees',                 sets: 4, reps: '10-15',  rest: '60s', notes: '' },
  { name: 'Battle Ropes',            sets: 5, reps: '30s',    rest: '30s', notes: '' },
  { name: 'Rowing Machine',          sets: 1, reps: '15 min', rest: '—',   notes: 'Drive with legs first' },
  { name: 'Elliptical Trainer',      sets: 1, reps: '20 min', rest: '—',   notes: '' },
  { name: 'Stair Climber',           sets: 1, reps: '15 min', rest: '—',   notes: '' },
]
