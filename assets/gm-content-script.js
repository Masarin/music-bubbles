// Copyright (C) 2014  Joseph DeBono

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.


var gm_player = {
	buttons : null,
	playing : false,
	disabled : true
};

function getButtons() {
	if (gm_player.buttons == null) {
		player = document.getElementById('player');
		buttonElements = player.getElementsByTagName('sj-icon-button');
		gm_player.buttons = {};
		for (var i = 0; i < buttonElements.length; i++) {
			id = buttonElements[i].getAttribute('data-id');
			if (id != null) {
				gm_player.buttons[id] = buttonElements[i];
			}
			if (id == "play-pause")	{
				playButtonObserver.observe(buttonElements[i], {attributes: true});				
			}
			if (id == "rewind") {
				buttonElements[i].onclick= function() { setTimeout(observeSongTitle, 100); };
			}
		}
	}

	thumbsContainer = document.getElementById('player').getElementsByClassName('rating-container');

	if (thumbsContainer != null && thumbsContainer.length > 0) {
		thumbs = thumbsContainer[0].children;

		for (var i = 0; i < thumbs.length; i++) {
			rating = thumbs[i].getAttribute('data-rating');			
			if (rating == 1) {
				gm_player.buttons.dislike = thumbs[i];				

			} else if (rating == 5) {
				gm_player.buttons.like = thumbs[i];
			}
		};

	}

	return gm_player.buttons;
}

function performCommand(request) {
	buttons = getButtons();
	if (request.command != null && buttons[request.command] != null) {
		buttons[request.command].click();		
	}

	if (request.scroll != null) {
		volume = document.getElementById("volume");		
		mouseEvent = new WheelEvent("mousewheel", { wheelDeltaY: request.scroll });		
  		volume.dispatchEvent(mouseEvent);
	}

}

function sendMessage(data) {
	port.postMessage(data);
}

function observeSongTitle() {
	gm_player.container 	= document.getElementById('playerSongInfo');

	songData = {};
	try {
		songData.songTitle 	= document.getElementById('player-song-title').textContent;
		songData.artist 	= document.getElementById('player-artist').textContent;
		songData.album		= gm_player.container.getElementsByClassName('player-album')[0].textContent;
		songData.albumArtUrl= document.getElementById('playingAlbumArt').src;
		songData.duration 	= document.getElementById('material-player-progress').getAttribute('aria-valuemax');
		songData.durationAt	= document.getElementById('material-player-progress').getAttribute('aria-valuenow');

		var up = document.querySelector('.player-rating-container [data-rating="5"]');
		var down = document.querySelector('.player-rating-container [data-rating="1"]');

		songData.thumbsUp = up.querySelector('::shadow core-icon svg').outerHTML;
		songData.thumbsDown = down.querySelector('::shadow core-icon svg').outerHTML;

		if (songData.durationAt == null) {
			songData.durationAt = 0;
		}
		songData.songStart = Date.now() - songData.durationAt;
		
	} catch (e) {}


	buttons = getButtons();

	updatePlayerStatus("songData", songData);
}

function setObserveSongTitle(disabled) {
	if (!disabled) {
		songInfo = document.getElementById('playerSongInfo');
		songTitleObserver.observe(songInfo, { characterData : true, childList : true});
		
		var up = document.querySelector('.player-rating-container [data-rating="5"]::shadow core-icon');
		var down = document.querySelector('.player-rating-container [data-rating="1"]::shadow core-icon');		
		thumbsUpObserver.observe(up, { attributes : true, attributeFilter : ["aria-label"] })
		thumbsDownObserver.observe(down, { attributes : true, attributeFilter : ["aria-label"] })
	}
}

function setObserveProgressBar(disabled) {
	if (!disabled) {
		sliderKnob = document.getElementById('material-player-progress');
		// timeout because this has to arrive after the observe play-pause change
		sliderKnob.onmouseup = function() {
				setTimeout(observeSongTitle, 250);
			}
	}
}

function updatePlayerStatus(key, value) {
	if (gm_player[key] != value) {
		gm_player[key] = value;
		data = {};
		data[key] = value;		
		sendMessage(data);
	}
}

function observePlayButton() {
	target = document.querySelector('[data-id="play-pause"]');
	disabled = target.hasAttribute("disabled");
	updatePlayerStatus("disabled" , disabled);
	if (!disabled) {
		setObserveSongTitle(value);
		setObserveProgressBar(value);
	}

	classes = target.getAttribute('class');
	if (classes != null && classes.length > 0 && classes.indexOf("playing") != -1) {
		updatePlayerStatus("playing", true);
	} else {
		updatePlayerStatus("playing", false);		
	}

}

var playButtonObserver = new MutationObserver(function(mutations) {
	observePlayButton(mutations[0].target);
	observeSongTitle();
});

var songTitleObserver = new MutationObserver(observeSongTitle);
var thumbsUpObserver = new MutationObserver(observeSongTitle);
var thumbsDownObserver = new MutationObserver(observeSongTitle);

function init() {
	setTimeout(function() {		
		if (player == undefined) {
			init();
		} else {
			buttons = getButtons();
			observeSongTitle();
		}
	}, 2000);
}

var port = chrome.runtime.connect({name: "Google-Music-Bubbles"});
port.onMessage.addListener(performCommand);

window.onload = init;