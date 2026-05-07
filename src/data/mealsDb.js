// Pre-built meal library with default nutritional values.
// Focused on Indian diet with common gym-friendly foods.
// protein: grams, calories: kcal

export const MEALS = [
  // ── Breakfast ──────────────────────────────────────────────────────────────
  { meal_name: 'Oats with Milk',           time: '7:00 AM',  items: 'Rolled oats 80g, Full-fat milk 200ml, Banana 1',             protein: 14, calories: 380 },
  { meal_name: 'Egg Omelette',             time: '7:00 AM',  items: 'Whole eggs 3, Vegetables, Oil 5ml',                          protein: 20, calories: 260 },
  { meal_name: 'Boiled Eggs',              time: '7:00 AM',  items: 'Whole eggs 4',                                               protein: 25, calories: 280 },
  { meal_name: 'Egg White Scramble',       time: '7:00 AM',  items: 'Egg whites 6, Vegetables, Salt, Pepper',                    protein: 22, calories: 130 },
  { meal_name: 'Poha',                     time: '8:00 AM',  items: 'Flattened rice 80g, Peanuts 20g, Vegetables, Oil 5ml',      protein: 8,  calories: 310 },
  { meal_name: 'Upma',                     time: '8:00 AM',  items: 'Semolina 80g, Vegetables, Oil 5ml, Mustard seeds',          protein: 7,  calories: 290 },
  { meal_name: 'Idli',                     time: '7:30 AM',  items: 'Idli 4 pcs, Sambar 100ml, Coconut chutney 30g',            protein: 9,  calories: 280 },
  { meal_name: 'Dosa',                     time: '8:00 AM',  items: 'Dosa 2 pcs, Sambar 100ml, Chutney 30g',                    protein: 8,  calories: 320 },
  { meal_name: 'Bread with Eggs',          time: '7:30 AM',  items: 'Whole wheat bread 2 slices, Boiled eggs 2, Butter 5g',      protein: 20, calories: 340 },
  { meal_name: 'Protein Shake',            time: '6:30 AM',  items: 'Whey protein 1 scoop (30g), Milk 250ml, Banana optional',   protein: 35, calories: 320 },
  { meal_name: 'Greek Yogurt Bowl',        time: '8:00 AM',  items: 'Greek yogurt 200g, Honey 10g, Mixed berries 50g, Chia 10g', protein: 18, calories: 250 },
  { meal_name: 'Smoothie Bowl',            time: '8:00 AM',  items: 'Banana 1, Milk 150ml, Oats 40g, Peanut butter 15g',        protein: 12, calories: 380 },
  { meal_name: 'Besan Chilla',             time: '8:00 AM',  items: 'Besan 80g, Vegetables, Oil 5ml, Spices',                   protein: 15, calories: 280 },
  { meal_name: 'Paneer Bhurji',            time: '8:00 AM',  items: 'Paneer 100g, Onion, Tomato, Oil 5ml, Spices',              protein: 18, calories: 280 },
  { meal_name: 'Aloo Paratha',             time: '8:30 AM',  items: 'Wheat flour 80g, Potato stuffing 100g, Ghee 5g, Curd',    protein: 9,  calories: 380 },

  // ── Pre-Workout ────────────────────────────────────────────────────────────
  { meal_name: 'Pre-Workout Snack',        time: '10:30 AM', items: 'Banana 1, Black coffee 1 cup',                              protein: 2,  calories: 120 },
  { meal_name: 'Pre-Workout Meal',         time: '11:00 AM', items: 'Brown rice 100g, Chicken breast 100g, Vegetables',          protein: 30, calories: 380 },
  { meal_name: 'Rice Cakes with PB',       time: '10:30 AM', items: 'Rice cakes 3, Peanut butter 30g',                          protein: 10, calories: 230 },

  // ── Post-Workout ───────────────────────────────────────────────────────────
  { meal_name: 'Post-Workout Shake',       time: '1:00 PM',  items: 'Whey protein 1 scoop, Banana 1, Milk 200ml',               protein: 40, calories: 380 },
  { meal_name: 'Curd Rice',                time: '1:00 PM',  items: 'Cooked rice 150g, Curd 150g, Salt, Tempering',             protein: 10, calories: 310 },
  { meal_name: 'Chicken Sandwich',         time: '1:00 PM',  items: 'Whole wheat bread 2, Chicken breast 100g, Vegetables',     protein: 32, calories: 380 },

  // ── Lunch ──────────────────────────────────────────────────────────────────
  { meal_name: 'Chicken Rice Bowl',        time: '1:00 PM',  items: 'Cooked brown rice 200g, Chicken breast 150g, Vegetables',  protein: 45, calories: 520 },
  { meal_name: 'Dal Rice',                 time: '1:30 PM',  items: 'Cooked rice 200g, Dal 150ml, Vegetables, Ghee 5g',        protein: 18, calories: 480 },
  { meal_name: 'Roti with Dal & Sabzi',   time: '1:00 PM',  items: 'Wheat roti 3, Dal 150ml, Sabzi 150g',                     protein: 16, calories: 440 },
  { meal_name: 'Chicken Curry + Rice',     time: '1:30 PM',  items: 'Chicken curry 200g, Cooked rice 200g',                    protein: 38, calories: 560 },
  { meal_name: 'Paneer Curry + Roti',      time: '1:30 PM',  items: 'Paneer curry 200g, Wheat roti 3',                         protein: 28, calories: 520 },
  { meal_name: 'Fish Curry + Rice',        time: '1:30 PM',  items: 'Fish curry 200g, Cooked rice 180g',                       protein: 36, calories: 480 },
  { meal_name: 'Rajma Rice',               time: '1:30 PM',  items: 'Kidney beans 150g, Cooked rice 200g, Onion gravy',        protein: 20, calories: 500 },
  { meal_name: 'Chole Bhature',            time: '1:30 PM',  items: 'Chole 200g, Bhature 2 pcs, Onion, Pickle',               protein: 18, calories: 640 },
  { meal_name: 'Egg Curry + Rice',         time: '1:30 PM',  items: 'Egg curry (4 eggs), Cooked rice 180g',                   protein: 28, calories: 520 },
  { meal_name: 'Tuna Salad',               time: '1:00 PM',  items: 'Tuna 150g, Mixed greens, Olive oil 10ml, Lemon, Veggies', protein: 35, calories: 280 },
  { meal_name: 'Quinoa Salad',             time: '1:00 PM',  items: 'Cooked quinoa 150g, Chickpeas 100g, Vegetables, Dressing',protein: 18, calories: 380 },

  // ── Snacks ─────────────────────────────────────────────────────────────────
  { meal_name: 'Mixed Nuts',               time: '4:00 PM',  items: 'Almonds 20g, Walnuts 15g, Cashews 15g',                   protein: 8,  calories: 220 },
  { meal_name: 'Banana + Peanut Butter',   time: '4:00 PM',  items: 'Banana 1, Peanut butter 30g',                             protein: 8,  calories: 280 },
  { meal_name: 'Sprouts Chaat',            time: '4:30 PM',  items: 'Mixed sprouts 150g, Onion, Tomato, Lemon, Spices',        protein: 12, calories: 180 },
  { meal_name: 'Boiled Chana',             time: '4:00 PM',  items: 'Black chana 150g, Lemon, Salt, Spices',                   protein: 15, calories: 200 },
  { meal_name: 'Protein Bar',              time: '4:00 PM',  items: '1 protein bar (brand varies)',                             protein: 20, calories: 220 },
  { meal_name: 'Greek Yogurt',             time: '4:00 PM',  items: 'Greek yogurt 200g, Honey 10g',                            protein: 16, calories: 180 },
  { meal_name: 'Cottage Cheese (Paneer)',  time: '4:30 PM',  items: 'Paneer 100g, Salt, Black pepper, Lemon',                 protein: 18, calories: 260 },
  { meal_name: 'Apple + Almond Butter',   time: '4:00 PM',  items: 'Apple 1, Almond butter 20g',                              protein: 5,  calories: 210 },
  { meal_name: 'Sweet Potato',             time: '4:00 PM',  items: 'Boiled sweet potato 150g, Salt, Pepper',                  protein: 3,  calories: 160 },
  { meal_name: 'Makhana (Fox Nuts)',       time: '4:00 PM',  items: 'Roasted makhana 40g, Ghee 5g, Spices',                   protein: 5,  calories: 150 },

  // ── Dinner ─────────────────────────────────────────────────────────────────
  { meal_name: 'Grilled Chicken + Veggies',time:'8:00 PM',  items: 'Chicken breast 200g, Mixed vegetables 200g, Olive oil 5ml',protein: 50, calories: 380 },
  { meal_name: 'Dal + Roti',               time: '8:00 PM',  items: 'Dal 200ml, Wheat roti 2, Ghee 5g',                       protein: 16, calories: 400 },
  { meal_name: 'Dal + Brown Rice',         time: '8:00 PM',  items: 'Dal 200ml, Cooked brown rice 150g, Salad',               protein: 18, calories: 430 },
  { meal_name: 'Grilled Fish',             time: '8:00 PM',  items: 'Fish fillet 200g, Lemon, Herbs, Olive oil 5ml, Salad',   protein: 42, calories: 320 },
  { meal_name: 'Paneer Tikka + Salad',     time: '8:00 PM',  items: 'Paneer tikka 150g, Mixed salad 200g',                    protein: 28, calories: 340 },
  { meal_name: 'Chicken Soup',             time: '7:30 PM',  items: 'Chicken pieces 150g, Vegetables, Broth, Spices',         protein: 28, calories: 200 },
  { meal_name: 'Khichdi',                  time: '8:00 PM',  items: 'Moong dal 60g, Rice 60g, Ghee 5g, Vegetables, Spices',   protein: 12, calories: 320 },
  { meal_name: 'Egg Bhurji + Roti',        time: '8:00 PM',  items: 'Eggs 3, Vegetables, Oil 5ml, Wheat roti 2',              protein: 24, calories: 380 },
  { meal_name: 'Tofu Stir Fry',            time: '8:00 PM',  items: 'Tofu 200g, Mixed vegetables 200g, Soy sauce, Oil 5ml',   protein: 22, calories: 280 },
  { meal_name: 'Soya Chunks Curry + Roti', time: '8:00 PM',  items: 'Soya chunks 80g, Curry gravy, Wheat roti 2',             protein: 30, calories: 420 },

  // ── Supplements / Shakes ───────────────────────────────────────────────────
  { meal_name: 'Mass Gainer Shake',        time: '9:00 PM',  items: 'Mass gainer 2 scoops, Milk 300ml',                        protein: 30, calories: 700 },
  { meal_name: 'Casein Protein Shake',     time: '10:00 PM', items: 'Casein protein 1 scoop, Milk 200ml',                     protein: 30, calories: 230 },
  { meal_name: 'BCAA Drink',               time: '12:00 PM', items: 'BCAA powder 1 scoop, Water 500ml',                        protein: 6,  calories: 25  },
  { meal_name: 'Creatine + Water',         time: '12:00 PM', items: 'Creatine monohydrate 5g, Water 250ml',                   protein: 0,  calories: 0   },
]
