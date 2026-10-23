from collections import defaultdict


def main():
    with open('words.txt', 'r') as f:
        words = f.readlines()

    word_combinations = defaultdict(list)

    for word in words:
        word_set = set(word)

        for w in words:
            if w == word:
                continue

            if set(w).issubset(word_set):
                word_combinations[word].append(w)

    word_combinations = {word: combinations for word, combinations in word_combinations.items() if len(combinations) > 7}

    with open('good_starting_words.txt', 'w') as f:
        for word, combinations in word_combinations.items():
            f.write(f'{word.strip()} -> {", ".join([c.strip() for c in combinations])}\n')


if __name__ == '__main__':
    main()