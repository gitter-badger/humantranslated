'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	mongoose = require('mongoose'),
	Story = mongoose.model('Story'),
	errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  _ = require('lodash'),
  mecab = require('mecab-ffi');

// Exclude these characters from being stored as words
var exclude_hiragana = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ', 'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ', 'わ', 'ゐ', 'ゑ', 'を', 'ん', 'が', 'ぎ', 'ぐ', 'げ', 'ご', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ', 'だ', 'ぢ', 'づ', 'で', 'ど', 'ば', 'び', 'ぶ', 'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ' ];
var exclude_katakana = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ワ', 'ヰ', 'ヱ', 'ヲ', 'ン', 'ガ', 'ギ', 'グ', 'ゲ', 'ゴ', 'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ', 'ダ', 'ヂ', 'ヅ', 'デ', 'ド', 'バ', 'ビ', 'ブ', 'ベ', 'ボ', 'パ', 'ピ', 'プ', 'ペ', 'ポ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ'];
var exclude_punctuation = [ ' ', '＝', 'ー', '。', '、', '「', '」', '（', '）'];
var exclude_compound = ['する', 'ます', 'なく', 'なり','いる', 'なっ', 'まし', 'うえ', 'ない', 'おら' ];

var exclude = exclude_hiragana.concat(exclude_katakana).concat(exclude_punctuation).concat(exclude_compound);

/**
 * Filter out excluded words
 */
var filterWord = function(word, callback) {
    var original = word[0];
    var furigana = word[9];

    // Do not add single kana or punctuation marks.
    if (exclude.indexOf(original) === -1) {
      var word_json = {
        original: original,
        furigana: furigana
      };
    }

		// return the new word
	  callback(null, word_json);
}

/**
 * Create a story
 */
exports.create = function(req, res) {
  var story = new Story(req.body);
  story.user = req.user;

  var words = mecab.parseSync(story.content);
  var word_dict = [];
  var parsed_words = 0;

  for(var i = 0; i < words.length; i++) {
    filterWord(words[i], function(err, word_json) {
      if (err) {
				return res.status(400).send({
					message: errorHandler.getErrorMessage(err)
				});
      }

      // Only add word once
      if (!_.findWhere(word_dict, word_json)) {
				word_dict.push(word_json);
      }

			// Make sure all words in story.content have been processed
      if (++parsed_words == words.length) {
				story.wordcount = word_dict.length;
				story.words = word_dict;

				// all words processed, let's save
				story.save(function(err) {
					if (err) {
						return res.status(400).send({
							message: errorHandler.getErrorMessage(err)
						});
					} else {
						res.json(story);
					}
				});
			}
    });
  }
};


/**
 * Show the current story
 */
exports.read = function(req, res) {
	res.json(req.story);
};

/**
 * Update a story
 */
exports.update = function(req, res) {
  var story = req.story;
  story = _.extend(story, req.body);

  var words = mecab.parseSync(story.content);
  var word_dict = [];
  var parsed_words = 0;

  for(var i = 0; i < words.length; i++) {
    filterWord(words[i], function(err, word_json) {
      if (err) {
				return res.status(400).send({
					message: errorHandler.getErrorMessage(err)
				});
      }

      // Only add word once
      if (!_.findWhere(word_dict, word_json)) {
				word_dict.push(word_json);
      }

			// Make sure all words in story.content have been processed
      if (++parsed_words == words.length) {
				story.wordcount = word_dict.length;
				story.words = word_dict;

				// all words processed, let's save
				story.save(function(err) {
					if (err) {
						return res.status(400).send({
							message: errorHandler.getErrorMessage(err)
						});
					} else {
						res.json(story);
					}
				});
			}
    });
  }
};

/**
 * Delete an story
 */
exports.delete = function(req, res) {
	var story = req.story;

	story.remove(function(err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(story);
		}
	});
};

/**
 * List of Storys
 */
exports.list = function(req, res) {
	Story.find().sort('-created').populate('user', 'displayName').exec(function(err, stories) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(stories);
		}
	});
};

/**
 * Story middleware
 */
exports.storyByID = function(req, res, next, id) {
	Story.findById(id).populate('user', 'displayName').exec(function(err, story) {
		if (err) return next(err);
		if (!story) return next(new Error('Failed to load story ' + id));
		req.story = story;
		next();
	});
};
