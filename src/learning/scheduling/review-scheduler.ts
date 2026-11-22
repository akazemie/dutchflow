import { createEmptyCard, fsrs, Rating, type Card, type CardInput, type Grade } from "ts-fsrs";
import type { SchedulerRating } from "@/learning/contracts/module";

const RATING_TO_GRADE: Record<SchedulerRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export type SerializedReviewCard = Omit<Card, "due" | "last_review"> & {
  due: string;
  last_review: string | null;
};

export interface ReviewScheduler {
  schedule(input: {
    card?: SerializedReviewCard;
    rating: SchedulerRating;
    now: Date;
  }): SerializedReviewCard;
}

function deserializeCard(card: SerializedReviewCard): CardInput {
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : null,
  };
}

function serializeCard(card: Card): SerializedReviewCard {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review?.toISOString() ?? null,
  };
}

export function createFsrsReviewScheduler(): ReviewScheduler {
  const scheduler = fsrs({ enable_fuzz: false, enable_short_term: false });
  return {
    schedule({ card, rating, now }) {
      const currentCard = card ? deserializeCard(card) : createEmptyCard(now);
      return serializeCard(scheduler.next(currentCard, now, RATING_TO_GRADE[rating]).card);
    },
  };
}
