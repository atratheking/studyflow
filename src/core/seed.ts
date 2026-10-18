import { uid, type State, type StudySet } from "./types";
function example(
  title: string,
  description: string,
  color: string,
  terms: [string, string][],
): StudySet {
  const now = Date.now();
  return {
    id: uid(),
    title,
    description,
    color,
    created: now,
    updated: now,
    sample: true,
    cards: terms.map(([term, definition]) => ({ id: uid(), term, definition })),
  };
}
export function seed(): State {
  return {
    version: 1,
    sets: [
      example(
        "Biology: the building blocks of life",
        "An original starter set covering cells, energy, and the molecules that make life possible.",
        "#bbdccc",
        [
          [
            "Cell",
            "The smallest structural and functional unit of a living organism.",
          ],
          [
            "Mitochondrion",
            "An organelle that converts energy from nutrients into ATP through cellular respiration.",
          ],
          [
            "Photosynthesis",
            "The process by which plants use light energy to make sugars from carbon dioxide and water.",
          ],
          [
            "DNA",
            "The molecule that stores hereditary information in living organisms.",
          ],
          [
            "Osmosis",
            "The movement of water across a selectively permeable membrane toward a higher solute concentration.",
          ],
          [
            "Enzyme",
            "A biological catalyst that speeds up a chemical reaction without being consumed.",
          ],
          [
            "Homeostasis",
            "The regulation of internal conditions to maintain a stable environment.",
          ],
          [
            "Ribosome",
            "A cellular structure that assembles proteins using instructions carried by messenger RNA.",
          ],
          [
            "Chloroplast",
            "The organelle in plant cells where photosynthesis takes place.",
          ],
          [
            "Diffusion",
            "The net movement of particles from higher concentration to lower concentration.",
          ],
          [
            "Nucleus",
            "The membrane-bound structure that contains most of a eukaryotic cell’s genetic material.",
          ],
          [
            "ATP",
            "A molecule that transfers usable energy to cellular processes.",
          ],
        ],
      ),
      example(
        "Psychology: how we learn",
        "Explore memory, behaviour, and the science of learning. Original sample content.",
        "#d9cced",
        [
          [
            "Working memory",
            "A limited-capacity system that temporarily holds information for active use.",
          ],
          [
            "Retrieval practice",
            "Strengthening learning by recalling information from memory.",
          ],
          [
            "Spaced repetition",
            "Reviewing information at increasing intervals to support long-term retention.",
          ],
          [
            "Classical conditioning",
            "Learning an association between two stimuli.",
          ],
          [
            "Cognitive bias",
            "A systematic tendency in thinking that can affect judgment.",
          ],
          [
            "Metacognition",
            "Awareness and regulation of one’s own thinking and learning.",
          ],
          [
            "Encoding",
            "The process of converting information into a form that memory can store.",
          ],
          [
            "Consolidation",
            "The process through which a memory becomes more stable over time.",
          ],
        ],
      ),
      example(
        "Spanish: everyday essentials",
        "A small, original vocabulary set to get your practice started.",
        "#f4d5bb",
        [
          ["Hola", "Hello"],
          ["Gracias", "Thank you"],
          ["Por favor", "Please"],
          ["Buenos días", "Good morning"],
          ["Agua", "Water"],
          ["Libro", "Book"],
          ["Aprender", "To learn"],
          ["Hasta luego", "See you later"],
        ],
      ),
    ],
    folders: [],
    reviews: {},
    activity: [],
    best: {},
    settings: { name: "Student", theme: "dark", strict: false, dailyGoal: 20 },
    draft: null,
  };
}
