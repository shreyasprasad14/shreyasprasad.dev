
def main():
   file = open('good_starting_words.txt', 'r')

   raw_words = file.readlines()

   with open('raw_words.txt', 'w') as f:
       for word in raw_words:
           f.write(f'{word.split(' ')[0]}\n')


if __name__ == '__main__':
    main()