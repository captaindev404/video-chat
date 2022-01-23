const {isSupported, createLocalTracks, connect} = require('twilio-video')
import {tokenGenerator} from './tokenGenerator';


if (isSupported) {
  console.log('Twilio is supported')
} else {
  console.error('This browser is not supported by twilio-video.js')
}

const roomName = 'captain-room'
let identity = ''

const container = document.getElementById('local-video');
const joinButton = document.getElementById('join-room')
const exitButton = document.getElementById('exit-room')
const nameInput = document.getElementById('name-input')

function startVideoUI() {
  joinButton.disabled = false;
  exitButton.disabled = false;
  container.innerHTML = '';
}

function endVideoUI() {
  joinButton.disabled = true;
  exitButton.disabled = true;
  container.innerHTML = '';
}

function stopVideo(track) {
  track.stop();
  endVideoUI();
}

function participantConnected(participant) {
  console.log(`Participant %s connected`,participant.identity)

  const div = document.createElement('div')
  div.id = participant.sid
  div.innerText = participant.identity

  participant.on('trackSubscribed', track => trackSubscribed(div, track));
  participant.on('trackUnsubscribed', trackUnsubscribed);

  participant.tracks.forEach(publication => {
    if (publication.isSubscribed) {
      trackSubscribed(div, publication.track);
    }
  });

  document.body.appendChild(div);
}

function participantDisconnected(participant) {
  console.log('Participant "%s" disconnected', participant.identity);
  document.getElementById(participant.sid).remove();
}

function trackSubscribed(div, track) {
  div.appendChild(track.attach());
}

function trackUnsubscribed(track) {
  track.detach().forEach(element => element.remove());
}

async function startVideo() {
  startVideoUI()
  const tracks = await createLocalTracks()

  const localVideoTrack = tracks.find(track => track.kind === 'video');
  container.append(localVideoTrack.attach())

  exitButton.addEventListener('click', function () {
    stopVideo(localVideoTrack)
  })

  const generatedToken = tokenGenerator(identity, roomName);

  const room = await connect(generatedToken, {
    name: roomName,
    tracks
  })

  room.participants.forEach(participantConnected);
  room.on('participantConnected', participantConnected);

  room.on('participantDisconnected', participantDisconnected);
  room.once('disconnected', error => room.participants.forEach(participantDisconnected));

  window.addEventListener('beforeunload', () => room.disconnect());
  window.addEventListener('pagehide', () => room.disconnect());
}

function onNameKeyPress(event) {
  const value = event.target.value

  if (value === '') {
    return
  }
  identity = value
  joinButton.disabled = false
}

nameInput.addEventListener('keypress', onNameKeyPress)

joinButton.addEventListener('click', startVideo)
