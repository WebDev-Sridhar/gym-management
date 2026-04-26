import HeroA from "../../../components/gym/hero/HeroA";
import HeroB from "../../../components/gym/hero/HeroB";
import HeroC from "../../../components/gym/hero/HeroC";

export const HERO_REGISTRY = {
  A: {
    component: HeroA,
    allowedPlans: ["starter", "pro", "premium"],
  },
  B: {
    component: HeroB,
    allowedPlans: ["starter", "pro", "premium"],
  },
  C: {
    component: HeroC,
    allowedPlans: ["pro", "premium"],
  },
};