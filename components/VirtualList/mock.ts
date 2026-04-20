

export interface FeedItem {
  id: string;
  author: { name: string; avatar: string };
  createdAt: string;
  text: string;
  images: string[];
  height?: number;
}

const SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "A journey of a thousand miles begins with a single step.",
  "To be or not to be, that is the question.",
  "All that glitters is not gold.",
  "Actions speak louder than words.",
  "Beauty is in the eye of the beholder.",
  "Better late than never.",
  "Birds of a feather flock together.",
  "Cleanliness is next to godliness.",
  "Don't count your chickens before they hatch.",
  "Don't judge a book by its cover.",
  "Early bird catches the worm.",
  "Every cloud has a silver lining.",
  "Honesty is the best policy.",
  "If it ain't broke, don't fix it.",
  "Knowledge is power.",
  "Laughter is the best medicine.",
  "Life is what happens when you're busy making other plans.",
  "Practice makes perfect.",
  "Rome wasn't built in a day.",
  "The pen is mightier than the sword.",
  "Time is money.",
  "Two heads are better than one.",
  "When in Rome, do as the Romans do.",
  "You can't judge a book by its cover.",
  "Success is not final, failure is not fatal: It is the courage to continue that counts.",
  "Believe you can and you're halfway there.",
  "The only way to do great work is to love what you do.",
  "In the middle of every difficulty lies opportunity.",
  "Happiness depends upon ourselves.",
  "Life is 10% what happens to us and 90% how we react to it.",
  "Dream big and dare to fail.",
  "It does not matter how slowly you go as long as you do not stop.",
  "Everything you can imagine is real.",
  "What we think, we become."
];

const NAMES = [
  "Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack",
  "Kevin", "Liam", "Mia", "Noah", "Olivia", "Peter", "Quinn", "Rachel", "Sam", "Tina",
  "Ursula", "Victor", "Wendy", "Xander", "Yvonne", "Zack"
];

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomItem = <T>(arr: T[]): T => {
  return arr[getRandomInt(0, arr.length - 1)];
};

const generateRandomText = (minSentences: number, maxSentences: number): string => {
  const count = getRandomInt(minSentences, maxSentences);
  const selectedSentences = [];
  for (let i = 0; i < count; i++) {
    selectedSentences.push(getRandomItem(SENTENCES));
  }
  return selectedSentences.join(" ");
};

const getAvatar = (i: number): string =>
  `https://api.dicebear.com/7.x/adventurer-neutral/png?size=100&seed=${(i % 1000) + 1}`;
const getImg = (seed: number): string => `https://picsum.photos/seed/${seed}/600/600`;
const getPoster = (seed: number): string => `https://picsum.photos/seed/poster-${seed}/800/450`;

export const generateMockData = (count: number): FeedItem[] => {
  const data: FeedItem[] = [];
  for (let i = 0; i < count; i++) {
    const hasImage = Math.random() > 0.6; // 40% chance of having images
    const text = generateRandomText(1, 5); // 1 to 5 sentences

    const images: string[] = [];
    if (hasImage) {
      const imageCount = getRandomInt(1, 3);
      for (let j = 0; j < imageCount; j++) {
        const seed = i * 1000 + j; // Ensure unique seed for each image
        // Randomly choose between square image and poster
        if (Math.random() > 0.5) {
          images.push(getImg(seed));
        } else {
          images.push(getPoster(seed));
        }
      }
    }

    data.push({
      id: `item-${i}`, // Keep simple ID for consistency, or use uuidv4() if needed
      author: {
        name: getRandomItem(NAMES),
        avatar: getAvatar(i),
      },
      createdAt: new Date(Date.now() - getRandomInt(0, 1000000000)).toLocaleString(),
      text: text,
      images: images,
      height: 100, // Default fixed height
    });
  }
  return data;
};
