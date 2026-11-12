import { EASY_QUESTIONS } from './nutshell-easy-questions.mjs';

// Original, harder general-knowledge questions. Kept outside public/ so answers stay private.
export const QUESTIONS = [
  ['Which river flows through Vienna Budapest and Belgrade?', ['Danube', 'the Danube', 'Danube River', 'the Danube River']],
  ['Which country was formerly known as Ceylon?', ['Sri Lanka']],
  ['What is the capital city of Turkey?', ['Ankara']],
  ['Which mountain range forms a natural border between France and Spain?', ['Pyrenees', 'the Pyrenees']],
  ['Which country completely surrounds the nation of Lesotho?', ['South Africa']],
  ['Which sea lies between the Arabian Peninsula and northeast Africa?', ['Red Sea', 'the Red Sea']],
  ['Which South American country has Portuguese as its official language?', ['Brazil']],
  ['Which Italian city is home to the Uffizi Gallery?', ['Florence', 'Firenze']],
  ['Which country is home to the ancient city of Petra?', ['Jordan']],
  ['Which strait separates mainland Europe from northern Africa?', ['Strait of Gibraltar', 'the Strait of Gibraltar', 'Gibraltar Strait', 'Gibraltar']],

  ['Which element has the chemical symbol W?', ['Tungsten', 'Wolfram']],
  ['What is the name of the process that converts sugar into alcohol?', ['Fermentation', 'alcoholic fermentation', 'ethanol fermentation']],
  ['Which part of a cell contains most of its genetic material?', ['Nucleus', 'the nucleus', 'cell nucleus', 'the cell nucleus']],
  ['What is the most abundant gas in the atmosphere of Earth?', ['Nitrogen']],
  ['Which scientist formulated the three laws of planetary motion?', ['Johannes Kepler', 'Kepler']],
  ['What is the scientific name for the study of fungi?', ['Mycology']],
  ['Which blood vessels carry blood away from the heart?', ['Arteries', 'artery', 'the arteries']],
  ['What is the name of the boundary around a black hole?', ['Event horizon', 'the event horizon']],
  ['Which vitamin can human skin produce when exposed to sunlight?', ['Vitamin D', 'D', 'vitamin D3', 'D3']],
  ['What is the name of the hardest substance in the human body?', ['Tooth enamel', 'enamel', 'dental enamel']],

  ['Which empire was ruled by Suleiman the Magnificent?', ['Ottoman Empire', 'the Ottoman Empire', 'Ottoman', 'the Ottomans']],
  ['Which ancient civilization built the city of Machu Picchu?', ['Inca', 'the Inca', 'Incas', 'the Incas', 'Inca Empire', 'the Inca Empire']],
  ['Which treaty formally ended the First World War between Germany and the Allies?', ['Treaty of Versailles', 'the Treaty of Versailles', 'Versailles Treaty', 'Versailles']],
  ['Which English king had six wives during his reign?', ['Henry VIII', 'Henry the Eighth', 'Henry 8', 'Henry 8th', 'King Henry VIII', 'King Henry the Eighth']],
  ['Which city was divided by a wall from 1961 until 1989?', ['Berlin']],
  ['Who was the first woman to win a Nobel Prize?', ['Marie Curie', 'Curie', 'Madame Curie', 'Maria Sklodowska Curie', 'Maria Skłodowska Curie']],
  ['Which ancient city was buried by the eruption of Vesuvius in 79 AD?', ['Pompeii', 'Herculaneum']],
  ['Which queen was the last active ruler of the Ptolemaic Kingdom of Egypt?', ['Cleopatra', 'Cleopatra VII', 'Cleopatra 7', 'Cleopatra the Seventh']],
  ['Which document was sealed by King John at Runnymede in 1215?', ['Magna Carta', 'the Magna Carta']],
  ['Which French military leader was defeated at the Battle of Waterloo?', ['Napoleon Bonaparte', 'Napoleon', 'Napoleon I', 'Napoleon the First']],

  ['Who wrote the novel One Hundred Years of Solitude?', ['Gabriel Garcia Marquez', 'Gabriel García Márquez', 'Garcia Marquez', 'García Márquez', 'Marquez', 'Márquez']],
  ['Which author created the fictional detective Hercule Poirot?', ['Agatha Christie', 'Christie']],
  ['Which Shakespeare play features the characters Iago and Desdemona?', ['Othello']],
  ['Who painted the work known as The Persistence of Memory?', ['Salvador Dali', 'Salvador Dalí', 'Dali', 'Dalí']],
  ['Which composer wrote the orchestral work The Four Seasons?', ['Antonio Vivaldi', 'Vivaldi']],
  ['Which Greek goddess is associated with wisdom and the city of Athens?', ['Athena', 'Athene']],
  ['What is the surname of the sisters who wrote Jane Eyre and Wuthering Heights?', ['Bronte', 'Brontë', 'the Brontes', 'the Brontës']],
  ['Which artist painted the ceiling of the Sistine Chapel?', ['Michelangelo', 'Michelangelo Buonarroti']],
  ['Which musical instrument is played by moving hands near antennas without touching them?', ['Theremin', 'a theremin', 'the theremin']],
  ['Which novel opens with the words Call me Ishmael?', ['Moby Dick', 'MobyDick']],

  ['Which spice is made from the dried stigmas of a crocus flower?', ['Saffron']],
  ['Which country is the birthplace of the martial art of capoeira?', ['Brazil']],
  ['What is the Japanese art of repairing broken pottery with gold called?', ['Kintsugi', 'kintsukuroi']],
  ['Which chess piece can jump over other pieces?', ['Knight', 'the knight', 'a knight', 'knights']],
  ['Which film features a computer named HAL 9000?', ['2001 A Space Odyssey', '2001', 'A Space Odyssey']],
  ['Which board game features rooms weapons and suspects including Colonel Mustard?', ['Cluedo', 'Clue']],
  ['Which country is the origin of the cheese called halloumi?', ['Cyprus']],
  ['What is the name of the currency used in Switzerland?', ['Swiss franc', 'Swiss francs', 'the Swiss franc', 'CHF', 'franc', 'francs']],
  ['Which tennis tournament is played on clay courts at Roland Garros?', ['French Open', 'the French Open', 'Roland Garros']],
  ['Which company originally developed the video game character Sonic the Hedgehog?', ['Sega']],
].map(([question, answers]) => ({ question, answers }));

// Difficulty follows the guesser, not the Nut Picker.
export const QUESTION_BANKS = { A: QUESTIONS, B: EASY_QUESTIONS };
