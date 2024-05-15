

def main():
    with open('ranked_words.txt', 'r') as f:
        words = f.readlines()

    four_letter_words = [word for word in words if 7 == len(word.strip().split(' ')[0])]

    with open('filtered_ranked_words.txt', 'w') as f:
        for word in four_letter_words:
            f.write(f'{word.strip()}\n')


if __name__ == '__main__':
    main()