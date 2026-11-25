import { describe, expect, it } from "vitest";
import { VisibleExerciseTimer } from "./visible-exercise-timer";

describe("VisibleExerciseTimer", () => {
  it("counts visible-tab time and excludes paused time", () => {
    let time = 0;
    const timer = new VisibleExerciseTimer({ now: () => time });

    timer.start();
    time = 1_000;
    timer.pause();
    time = 20_000;
    timer.resume();
    time = 21_500;

    expect(timer.elapsedMs()).toBe(2_500);
  });

  it("caps a single exercise at five minutes", () => {
    let time = 0;
    const timer = new VisibleExerciseTimer({ now: () => time });

    timer.start();
    time = 9 * 60 * 1000;

    expect(timer.elapsedMs()).toBe(5 * 60 * 1000);
  });

  it("restarts timing for the next exercise", () => {
    let time = 0;
    const timer = new VisibleExerciseTimer({ now: () => time });

    timer.start();
    time = 1_000;
    timer.start();
    time = 1_300;

    expect(timer.elapsedMs()).toBe(300);
  });
});
