#include <iostream>
#include <fstream>
#include <map>
#include <vector>
#include <algorithm>

int main() {
    std::string word_list_path = "../good_starting_words.txt";
    std::string frequency_path = "../word_freq.txt";

    std::ifstream word_list(word_list_path);
    std::ifstream frequency(frequency_path);

    std::map<std::string, unsigned long long> point_map;
    std::string line;
    while (std::getline(frequency, line)) {
        point_map[line.substr(0, line.find('\t'))] = std::stoull(line.substr(line.find('\t') + 1));
    }
    std::cout << "Loaded " << point_map.size() << " words with frequencies" << std::endl;

    std::vector<std::pair<std::string, unsigned long long>> words_with_points;
    words_with_points.reserve(350000);
    while (std::getline(word_list, line)) {
        const auto arrow_pos = line.find(" -> ");
        const std::string key = line.substr(0, arrow_pos);
        std::string combinations = line.substr(arrow_pos + 4);

        const std::string delimiter = ", ";

        unsigned long long pos;
        std::string token;
        unsigned long long points = 0;
        
        while ((pos = combinations.find(delimiter)) != std::string::npos) {
            token = combinations.substr(0, pos);
            if (token.length() >= 3 && point_map.find(token) != point_map.end()) {
                points += point_map[token];
            }
            combinations.erase(0, pos + delimiter.length());
        }
        words_with_points.emplace_back(key, points);
    }
    std::cout << "Loaded " << words_with_points.size() << " words with points" << std::endl;

    std::sort(
    words_with_points.begin(), words_with_points.end(),
    [](const std::pair<std::string, unsigned long long>& a, const std::pair<std::string, unsigned long long>& b
    ) {
        return a.second > b.second;
    });

    std::cout << "Sorted words by points" << std::endl;

    // Write sorted words to file
    std::ofstream sorted_file("ranked_words.txt");
    for (auto const& [key_word, points] : words_with_points) {
        sorted_file << key_word << " " << points << std::endl;
    }
    sorted_file.close();

    return 0;
}