import { Page } from 'puppeteer';

export class HumanBehaviorSimulator {
  static randomDelay(min: number = 90000, max: number = 150000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`[HumanBehavior] Random delay: ${Math.ceil(delay / 1000)}s`);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  static async typeHumanLike(
    page: Page,
    selector: string,
    text: string
  ): Promise<void> {
    await page.focus(selector);

    for (const char of text) {
      const charDelay = Math.random() * 80 + 40; // 40-120ms
      await page.keyboard.type(char, { delay: charDelay });

      if (Math.random() < 0.1) {
        await new Promise((r) => setTimeout(r, Math.random() * 300 + 200));
      }
    }
  }

  static async simulateMouseMovement(page: Page, count: number = 3): Promise<void> {
    const movements = Math.floor(Math.random() * 3) + count;

    for (let i = 0; i < movements; i++) {
      const x = Math.floor(Math.random() * 800) + 100;
      const y = Math.floor(Math.random() * 600) + 100;
      await page.mouse.move(x, y, { steps: 10 });
      await new Promise((r) => setTimeout(r, Math.random() * 200 + 100));
    }
  }

  static async simulateScrolling(page: Page): Promise<void> {
    await page.evaluate(async () => {
      const scrolls = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < scrolls; i++) {
        const scrollAmount = Math.floor(Math.random() * 300) + 200;
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        await new Promise((r) => setTimeout(r, Math.random() * 500 + 300));
      }

      if (Math.random() > 0.5) {
        window.scrollBy({ top: -150, behavior: 'smooth' });
        await new Promise((r) => setTimeout(r, 200));
      }
    });
  }

  static async hesitate(): Promise<void> {
    if (Math.random() > 0.7) {
      const delay = Math.random() * 800 + 200;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  static async simulateReading(textLength: number): Promise<void> {
    const readingTime = textLength * (Math.random() * 20 + 40);
    const clampedTime = Math.min(Math.max(readingTime, 1000), 5000);
    await new Promise((r) => setTimeout(r, clampedTime));
  }
}
