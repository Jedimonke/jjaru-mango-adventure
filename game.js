/* ==========================================================================
   짜루와 꾸꾸의 달콤한 망고 모험 - 게임 스크립트 (Core logic & Sound & Graphics)
   ========================================================================== */

// 1. 글로벌 사운드 합성기 (Web Audio API 기반 8비트 사운드 칩셋)
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.bgmInterval = null;
    this.bgmSequence = 0;
    
    // 로맨틱한 코드 진행 (C - G - Am - F)
    this.chords = [
      [261.63, 329.63, 392.00], // C (도, 미, 솔)
      [293.66, 392.00, 493.88], // G (레, 솔, 시)
      [220.00, 261.63, 329.63], // Am (라, 도, 미)
      [174.61, 220.00, 261.63]  // F (파, 라, 도)
    ];
    
    // 따뜻하고 아름다운 멜로디 루프
    this.melody = [
      329.63, 392.00, 523.25, 493.88, 392.00, 440.00, 392.00, 329.63,
      349.23, 440.00, 587.33, 523.25, 440.00, 392.00, 329.63, 293.66,
      329.63, 392.00, 523.25, 587.33, 659.25, 587.33, 523.25, 440.00,
      349.23, 440.00, 523.25, 493.88, 392.00, 293.66, 329.63, 329.63
    ];
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  toggleMute(btnEl) {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
      btnEl.classList.add('mute');
      btnEl.querySelector('.sound-icon').innerText = '🔇';
      this.stopBGM();
    } else {
      btnEl.classList.remove('mute');
      btnEl.querySelector('.sound-icon').innerText = '🔊';
      this.startBGM();
      this.playChime();
    }
  }

  playTone(freq, type, duration, volume) {
    if (this.isMuted || !this.ctx) return;
    
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Tone play failed:", e);
    }
  }

  // 귀여운 효과음 합성
  playChime() { // 아이템 획득
    this.playTone(523.25, 'triangle', 0.15, 0.15); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.25, 0.15), 80); // E5
  }

  playJump() { // 점프
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.25);
      
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch(e) {}
  }

  playHurt() { // 방해물 충돌
    this.playTone(220.00, 'sawtooth', 0.25, 0.1);
    setTimeout(() => this.playTone(147.00, 'sawtooth', 0.35, 0.1), 100);
  }

  playSuccess() { // 클리어 팬파레
    const tempos = [261.63, 329.63, 392.00, 523.25];
    tempos.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.3, 0.15);
      }, i * 150);
    });
  }

  startBGM() {
    this.stopBGM();
    this.bgmSequence = 0;
    this.bgmInterval = setInterval(() => {
      if (this.isMuted) return;
      
      // 멜로디 연주
      const freq = this.melody[this.bgmSequence % this.melody.length];
      this.playTone(freq, 'sine', 0.35, 0.08);
      
      // 반주 (4박에 한 번씩 아르페지오 코드음 추가)
      if (this.bgmSequence % 4 === 0) {
        const chordIdx = Math.floor((this.bgmSequence % 16) / 4);
        const chord = this.chords[chordIdx];
        chord.forEach((noteFreq, i) => {
          setTimeout(() => {
            this.playTone(noteFreq * 0.5, 'triangle', 0.6, 0.04);
          }, i * 60);
        });
      }
      
      this.bgmSequence++;
    }, 250); // 120 BPM
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

const audio = new SoundSynth();

// 2. 캐릭터 그래픽 렌더링 엔진 (Canvas 상에 SVG 급으로 정밀 드로잉)
class CharacterRenderer {
  // 짜루 (안경 쓴 카푸치노 브라운 원숭이, 노란 후드 없음) 그리기
  static drawJjaru(ctx, x, y, state = 'idle', size = 50, frame = 0) {
    ctx.save();
    ctx.translate(x, y);

    const bob = Math.sin(frame * 0.15) * 2; // 대기 애니메이션 상하 바운스
    const walkSwing = state === 'walk' ? Math.sin(frame * 0.35) * 5 : 0;
    
    // 1. 긴 꼬리 그리기 (원숭이 상징 - 솜사탕 꼬리 끝 추가)
    ctx.beginPath();
    ctx.strokeStyle = '#9c7a68'; // 코코아 브라운
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(-size * 0.2, size * 0.35);
    
    const tailWave = Math.sin(frame * 0.1) * 15;
    ctx.bezierCurveTo(
      -size * 0.6, size * 0.4 + tailWave,
      -size * 0.8, -size * 0.1 + tailWave,
      -size * 0.7, -size * 0.4 + tailWave
    );
    ctx.stroke();

    // 꼬리 끝의 하얗고 복슬복슬한 솜뭉치 데코레이션
    ctx.beginPath();
    ctx.fillStyle = '#fdfbf7';
    ctx.arc(-size * 0.7, -size * 0.4 + tailWave, size * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // 2. 몸통 그리기 (깔끔한 갈색 몸통 - 후드 없이 귀엽게)
    ctx.beginPath();
    ctx.fillStyle = '#c2a38b'; // 카푸치노 브라운
    ctx.ellipse(0, size * 0.2 + bob, size * 0.32, size * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // 배 부분 (둥글고 하얀 털)
    ctx.beginPath();
    ctx.fillStyle = '#fdfbf7'; // 맑은 크림 화이트
    ctx.ellipse(0, size * 0.25 + bob, size * 0.2, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. 발 그리기
    ctx.fillStyle = '#9c7a68'; // 코코아 브라운
    // 왼발
    ctx.beginPath();
    ctx.arc(-size * 0.18 + walkSwing, size * 0.52 + bob, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // 오른발
    ctx.beginPath();
    ctx.arc(size * 0.18 - walkSwing, size * 0.52 + bob, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 4. 귀 그리기
    ctx.fillStyle = '#c2a38b';
    // 왼쪽 귀
    ctx.beginPath();
    ctx.arc(-size * 0.45, -size * 0.1 + bob, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // 오른쪽 귀
    ctx.beginPath();
    ctx.arc(size * 0.45, -size * 0.1 + bob, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // 귀 안쪽 (사랑스러운 핑크색)
    ctx.fillStyle = '#ffccd5';
    ctx.beginPath();
    ctx.arc(-size * 0.43, -size * 0.1 + bob, size * 0.11, 0, Math.PI * 2);
    ctx.arc(size * 0.43, -size * 0.1 + bob, size * 0.11, 0, Math.PI * 2);
    ctx.fill();

    // 5. 얼굴 형태 그리기 (하트형 원숭이 얼굴)
    ctx.fillStyle = '#c2a38b';
    ctx.beginPath();
    ctx.arc(0, -size * 0.08 + bob, size * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // 살구색 얼굴 마스크 (하트 형태 모양)
    ctx.fillStyle = '#ffe3d1'; // 부드러운 피치 베이지
    // 왼쪽 안면
    ctx.beginPath();
    ctx.arc(-size * 0.15, -size * 0.08 + bob, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // 오른쪽 안면
    ctx.beginPath();
    ctx.arc(size * 0.15, -size * 0.08 + bob, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // 턱 부분 연결
    ctx.beginPath();
    ctx.ellipse(0, size * 0.08 + bob, size * 0.28, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 수줍은 남편 원숭이 뺨 홍조 데코레이션
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#ffb3c1';
    ctx.beginPath();
    ctx.arc(-size * 0.24, size * 0.08 + bob, size * 0.08, 0, Math.PI * 2);
    ctx.arc(size * 0.24, size * 0.08 + bob, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 6. 눈 그리기
    ctx.fillStyle = '#000000';
    if (state === 'sad') {
      // 우는 눈 연출
      ctx.lineWidth = size * 0.05;
      ctx.strokeStyle = '#2d3436';
      ctx.lineCap = 'round';
      
      // 왼쪽 눈 슬픈 호형
      ctx.beginPath();
      ctx.arc(-size * 0.15, -size * 0.05 + bob, size * 0.06, Math.PI, 0);
      ctx.stroke();
      
      // 오른쪽 눈 슬픈 호형
      ctx.beginPath();
      ctx.arc(size * 0.15, -size * 0.05 + bob, size * 0.06, Math.PI, 0);
      ctx.stroke();
      
      // 눈물 줄기 그리기
      ctx.fillStyle = '#81ecec';
      ctx.beginPath();
      ctx.arc(-size * 0.14, size * 0.08 + bob + (frame % 10) * 1, size * 0.04, 0, Math.PI * 2);
      ctx.arc(size * 0.14, size * 0.08 + bob + ((frame + 5) % 10) * 1, size * 0.04, 0, Math.PI * 2);
      ctx.fill();
    } else if (state === 'happy') {
      // 기쁜 웃음 눈 (^^)
      ctx.lineWidth = size * 0.06;
      ctx.strokeStyle = '#2d3436';
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.arc(-size * 0.15, -size * 0.04 + bob, size * 0.08, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(size * 0.15, -size * 0.04 + bob, size * 0.08, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      // 일반 반짝이는 맑은 눈 (하이라이트 강화)
      ctx.beginPath();
      ctx.arc(-size * 0.15, -size * 0.05 + bob, size * 0.08, 0, Math.PI * 2);
      ctx.arc(size * 0.15, -size * 0.05 + bob, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      
      // 하이라이트 (다중 반짝임)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-size * 0.13, -size * 0.07 + bob, size * 0.03, 0, Math.PI * 2);
      ctx.arc(size * 0.17, -size * 0.07 + bob, size * 0.03, 0, Math.PI * 2);
      // 서브 반짝임 도트 추가
      ctx.arc(-size * 0.17, -size * 0.03 + bob, size * 0.015, 0, Math.PI * 2);
      ctx.arc(size * 0.13, -size * 0.03 + bob, size * 0.015, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. 안경 그리기 (짜루의 시그니처 - 얇고 세련된 안경테)
    ctx.lineWidth = size * 0.038;
    ctx.strokeStyle = '#4a4a4a'; // 동그란 세련된 차콜 뿔테
    
    // 왼쪽 안경 링
    ctx.beginPath();
    ctx.arc(-size * 0.16, -size * 0.05 + bob, size * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    
    // 오른쪽 안경 링
    ctx.beginPath();
    ctx.arc(size * 0.16, -size * 0.05 + bob, size * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    
    // 안경 다리 (연결 브릿지)
    ctx.beginPath();
    ctx.moveTo(-size * 0.02, -size * 0.05 + bob);
    ctx.lineTo(size * 0.02, -size * 0.05 + bob);
    ctx.stroke();
    
    // 8. 코와 수줍은 입
    ctx.fillStyle = '#8c6f5e';
    ctx.beginPath();
    ctx.arc(0, size * 0.03 + bob, size * 0.035, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = size * 0.035;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (state === 'sad') {
      // 삐죽 슬픈 시무룩 입
      ctx.arc(0, size * 0.15 + bob, size * 0.05, Math.PI, 0);
    } else if (state === 'happy') {
      // 활짝 미소 짓는 고양이형 w 입
      ctx.arc(-size * 0.03, size * 0.09 + bob, size * 0.03, 0, Math.PI);
      ctx.arc(size * 0.03, size * 0.09 + bob, size * 0.03, 0, Math.PI);
    } else {
      // 귀여운 작은 w 입
      ctx.arc(-size * 0.025, size * 0.11 + bob, size * 0.025, 0, Math.PI);
      ctx.arc(size * 0.025, size * 0.11 + bob, size * 0.025, 0, Math.PI);
    }
    ctx.stroke();

    // 9. 손 그리기
    ctx.fillStyle = '#ffe3d1';
    const handSwing = Math.sin(frame * 0.4) * 8;
    if (state === 'happy') {
      // 만세! 기쁨의 손 흔들기
      ctx.beginPath();
      ctx.arc(-size * 0.38, -size * 0.2 + handSwing + bob, size * 0.07, 0, Math.PI * 2);
      ctx.arc(size * 0.38, -size * 0.2 - handSwing + bob, size * 0.07, 0, Math.PI * 2);
      ctx.fill();
    } else if (state === 'sad') {
      // 모으고 미안해하는 작은 손
      ctx.beginPath();
      ctx.arc(-size * 0.08, size * 0.26 + bob, size * 0.06, 0, Math.PI * 2);
      ctx.arc(size * 0.08, size * 0.26 + bob, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 양쪽으로 벌린 귀여운 손
      ctx.beginPath();
      ctx.arc(-size * 0.38 + walkSwing, size * 0.2 + bob, size * 0.065, 0, Math.PI * 2);
      ctx.arc(size * 0.38 - walkSwing, size * 0.2 + bob, size * 0.065, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 꾸꾸 (해바라기 핀 꽂은 세상에서 제일 귀엽고 예쁜 골든 햄스터) 그리기
  static drawKkukku(ctx, x, y, state = 'idle', size = 50, frame = 0) {
    ctx.save();
    ctx.translate(x, y);

    const bob = Math.sin(frame * 0.18) * 2;
    const bodySizeW = size * 0.46; // 통통한 모찌 비율 가로 확장
    const bodySizeH = size * 0.40;

    // 1. 귀 그리기 (오동통한 아기 햄스터 귀)
    ctx.fillStyle = '#ffc87a'; // 따뜻한 피치 골드 주황
    // 왼쪽 귀
    ctx.beginPath();
    ctx.arc(-size * 0.22, -size * 0.24 + bob, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    // 오른쪽 귀
    ctx.beginPath();
    ctx.arc(size * 0.22, -size * 0.24 + bob, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 핑크 귀 안쪽 (베이비 핑크)
    ctx.fillStyle = '#ffb3c1';
    ctx.beginPath();
    ctx.arc(-size * 0.22, -size * 0.24 + bob, size * 0.09, 0, Math.PI * 2);
    ctx.arc(size * 0.22, -size * 0.24 + bob, size * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // 2. 동글동글 햄스터 몸통 (통통한 찹쌀떡 비율)
    ctx.fillStyle = '#ffc87a';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.1 + bob, bodySizeW, bodySizeH * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // 동그란 하얀 배/얼굴 영역 그리기
    ctx.fillStyle = '#fffefc'; // 뽀송뽀송 밀크화이트
    ctx.beginPath();
    ctx.ellipse(0, size * 0.18 + bob, bodySizeW * 0.75, bodySizeH * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. 발 그리기
    ctx.fillStyle = '#ffb3c1'; // 핑크빛 햄스터 발
    ctx.beginPath();
    ctx.arc(-size * 0.22, size * 0.48 + bob, size * 0.06, 0, Math.PI * 2);
    ctx.arc(size * 0.22, size * 0.48 + bob, size * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // 4. 눈 그리기 (예쁜 속눈썹과 초롱초롱한 다중광택 눈)
    ctx.fillStyle = '#000000';
    if (state === 'sad') {
      // 축 쳐진 글썽글썽 슬픈 눈
      ctx.lineWidth = size * 0.05;
      ctx.strokeStyle = '#2d3436';
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.arc(-size * 0.15, -size * 0.04 + bob, size * 0.05, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(size * 0.15, -size * 0.04 + bob, size * 0.05, Math.PI, 0);
      ctx.stroke();
    } else if (state === 'happy') {
      // 좋아서 어쩔 줄 모르는 웃는 하트 눈망울 (베지에 곡선으로 그리는 통통하고 완벽한 하트)
      ctx.fillStyle = '#ff5e7e'; // 사랑스러운 로즈 핑크빛
      
      // 왼쪽 하트 눈
      ctx.save();
      ctx.translate(-size * 0.16, -size * 0.02 + bob);
      ctx.scale(size * 0.007, size * 0.007);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.bezierCurveTo(-6, -13, -13, -7, -13, 0);
      ctx.bezierCurveTo(-13, 7, -6, 12, 0, 18);
      ctx.bezierCurveTo(6, 12, 13, 7, 13, 0);
      ctx.bezierCurveTo(13, -7, 6, -13, 0, -6);
      ctx.fill();
      ctx.restore();
      
      // 오른쪽 하트 눈
      ctx.save();
      ctx.translate(size * 0.16, -size * 0.02 + bob);
      ctx.scale(size * 0.007, size * 0.007);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.bezierCurveTo(-6, -13, -13, -7, -13, 0);
      ctx.bezierCurveTo(-13, 7, -6, 12, 0, 18);
      ctx.bezierCurveTo(6, 12, 13, 7, 13, 0);
      ctx.bezierCurveTo(13, -7, 6, -13, 0, -6);
      ctx.fill();
      ctx.restore();
    } else {
      // 기본 크고 세상에서 가장 예쁜 초롱초롱 눈망울 (속눈썹 추가)
      ctx.beginPath();
      ctx.arc(-size * 0.16, -size * 0.02 + bob, size * 0.09, 0, Math.PI * 2);
      ctx.arc(size * 0.16, -size * 0.02 + bob, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
      
      // 아내 꾸꾸의 아름답고 긴 속눈썹 (Eyelashes)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = size * 0.03;
      ctx.lineCap = 'round';
      
      // 왼쪽 속눈썹
      ctx.beginPath();
      ctx.arc(-size * 0.16, -size * 0.02 + bob, size * 0.095, Math.PI * 1.1, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.23, -size * 0.08 + bob);
      ctx.lineTo(-size * 0.28, -size * 0.12 + bob);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.21, -size * 0.04 + bob);
      ctx.lineTo(-size * 0.26, -size * 0.07 + bob);
      ctx.stroke();

      // 오른쪽 속눈썹
      ctx.beginPath();
      ctx.arc(size * 0.16, -size * 0.02 + bob, size * 0.095, Math.PI * 1.2, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.23, -size * 0.08 + bob);
      ctx.lineTo(size * 0.28, -size * 0.12 + bob);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.21, -size * 0.04 + bob);
      ctx.lineTo(size * 0.26, -size * 0.07 + bob);
      ctx.stroke();
      
      // 글썽 반짝이는 3중 화이트 하이라이트 스팟
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-size * 0.13, -size * 0.05 + bob, size * 0.035, 0, Math.PI * 2);
      ctx.arc(size * 0.19, -size * 0.05 + bob, size * 0.035, 0, Math.PI * 2);
      ctx.arc(-size * 0.19, size * 0.01 + bob, size * 0.015, 0, Math.PI * 2);
      ctx.arc(size * 0.13, size * 0.01 + bob, size * 0.015, 0, Math.PI * 2);
      ctx.arc(-size * 0.14, size * 0.02 + bob, size * 0.01, 0, Math.PI * 2);
      ctx.arc(size * 0.18, size * 0.02 + bob, size * 0.01, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. 볼터치 (그라데이션을 적용하여 부드럽고 아주 큐트하게 연출)
    ctx.save();
    const gradLeft = ctx.createRadialGradient(
      -size * 0.28, size * 0.08 + bob, 0,
      -size * 0.28, size * 0.08 + bob, size * 0.12
    );
    gradLeft.addColorStop(0, 'rgba(255, 179, 193, 0.95)');
    gradLeft.addColorStop(0.5, 'rgba(255, 179, 193, 0.55)');
    gradLeft.addColorStop(1, 'rgba(255, 179, 193, 0)');
    ctx.fillStyle = gradLeft;
    ctx.beginPath();
    ctx.arc(-size * 0.28, size * 0.08 + bob, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    const gradRight = ctx.createRadialGradient(
      size * 0.28, size * 0.08 + bob, 0,
      size * 0.28, size * 0.08 + bob, size * 0.12
    );
    gradRight.addColorStop(0, 'rgba(255, 179, 193, 0.95)');
    gradRight.addColorStop(0.5, 'rgba(255, 179, 193, 0.55)');
    gradRight.addColorStop(1, 'rgba(255, 179, 193, 0)');
    ctx.fillStyle = gradRight;
    ctx.beginPath();
    ctx.arc(size * 0.28, size * 0.08 + bob, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 6. 햄스터 콧구멍 & 작은 3자 입
    ctx.fillStyle = '#ffb3c1';
    ctx.beginPath();
    ctx.moveTo(-size * 0.03, size * 0.05 + bob);
    ctx.lineTo(0, size * 0.02 + bob);
    ctx.lineTo(size * 0.03, size * 0.05 + bob);
    ctx.fill();
    
    // 입과 앞니
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = size * 0.03;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // 시무룩 3자 입꼬리
    ctx.arc(-size * 0.03, size * 0.075 + bob, size * 0.03, 0, Math.PI);
    ctx.arc(size * 0.03, size * 0.075 + bob, size * 0.03, 0, Math.PI);
    ctx.stroke();

    // 활짝 웃을 때 작은 핑크 혓바닥/앞니
    if (state === 'happy') {
      ctx.fillStyle = '#ff5e7e';
      ctx.beginPath();
      ctx.arc(0, size * 0.09 + bob, size * 0.02, 0, Math.PI);
      ctx.fill();
    }

    // 7. 해바라기 핀 그리기 (꾸꾸의 최애 아이템, 나뭇잎 장식 및 프리미엄 레몬옐로우 핀)
    ctx.save();
    ctx.translate(-size * 0.26, -size * 0.22 + bob);
    ctx.scale(0.85, 0.85);
    
    // 싱그러운 소프트 연두 나뭇잎 데코
    ctx.fillStyle = '#a2e8bb';
    ctx.beginPath();
    ctx.ellipse(-size * 0.06, size * 0.06, size * 0.04, size * 0.08, Math.PI / 4, 0, Math.PI * 2);
    ctx.ellipse(size * 0.06, size * 0.06, size * 0.04, size * 0.08, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    
    // 해바라기 꽃잎 12개 회전하며 그리기
    ctx.fillStyle = '#ffe066'; // 선명하고 귀여운 레몬 옐로우
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.12, size * 0.04, size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 해바라기 씨앗 갈색 중심부 (밀크초콜릿 브라운)
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
    
    // 반짝이는 작은 도트
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size * 0.02, -size * 0.02, size * 0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 8. 꼬물꼬물 햄스터 손
    ctx.fillStyle = '#fffefc';
    if (state === 'happy') {
      // 기쁘게 박수치는 연출
      ctx.beginPath();
      ctx.arc(-size * 0.08, size * 0.22 + Math.sin(frame * 0.5) * 3 + bob, size * 0.05, 0, Math.PI * 2);
      ctx.arc(size * 0.08, size * 0.22 - Math.sin(frame * 0.5) * 3 + bob, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 다소곳이 손 모으고 기대하는 연출
      ctx.beginPath();
      ctx.arc(-size * 0.07, size * 0.24 + bob, size * 0.05, 0, Math.PI * 2);
      ctx.arc(size * 0.07, size * 0.24 + bob, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// 3. 게임 씬 매니저 및 플레이 로직
class ApologyGame {
  constructor() {
    this.currentScene = 'INTRO';
    this.currentStage = 1;
    this.frame = 0;
    
    // 게임 캔버스 제어
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // 게임 내부 데이터
    this.score = 0;
    this.targetScore = 10;
    this.lives = 3;
    this.isGameOver = false;
    this.isStageClear = false;
    
    // 플레이어 물리 및 상태
    this.player = {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      vx: 0,
      vy: 0,
      gravity: 0.38,
      isJumping: false,
      angle: 0
    };
    
    this.items = [];
    this.obstacles = [];
    this.particles = [];
    this.backgroundX = 0;
    this.distanceTraveled = 0;
    this.stageKeysCollected = 0;
    
    // 터치 입력 상태
    this.keys = { left: false, right: false, touch: false };
    
    // 스테이지별 고유 백그라운드 이미지 프리로드 관리
    this.bgImages = {
      1: 'assets/background_france.png',
      2: 'assets/background_italy.png',
      3: 'assets/background_cebu.png'
    };
    
    // 스토리 시나리오 리스트 (짜루와 꾸꾸의 한글 대화창)
    this.prologueScript = [
      { speaker: '짜루', text: '꾸꾸야... 내가 어제 진심으로 공감해주지 못하고 서운하게 만들어서 정말 많이 미안해... 😭', state: 'sad' },
      { speaker: '꾸꾸', text: '흥... 맨날 미안하다고만 하구... 자기는 내 맘 하나도 모르잖아! 😢', state: 'sad' },
      { speaker: '짜루', text: '내가 백 번 천 번 잘못했어... 내 반성의 진심을 증명하고 싶어!', state: 'sad' },
      { speaker: '짜루', text: '자기가 가장 좋아하는 세상에서 제일 달콤한 "궁극의 황금 망고"를 내 손으로 직접 찾아올게! 🥭✨', state: 'idle' },
      { speaker: '꾸꾸', text: '어...? 진짜...? 엄청 구하기 어려운 거잖아. 프랑스, 이탈리아 신혼여행지에서도 망고 찾기 힘들 텐데?', state: 'idle' },
      { speaker: '짜루', text: '걱정 마! 추억이 담긴 파리 거리와 토스카나 벌판을 지나 머나먼 세부 청정 바다 끝까지 다 뒤져서라도 꼭 가져올게. 기다려줘! ✈️', state: 'happy' },
      { speaker: '꾸꾸', text: '치... 길 잃어버리지 말고 얼른 다녀와... 조심하구... 🥺', state: 'sad' }
    ];

    this.epilogueScript = [
      { speaker: '짜루', text: '꾸꾸야! 나 돌아왔어! 약속을 지키려고 전 세계를 모험해 왔어! 🏃‍♂️💨', state: 'happy' },
      { speaker: '꾸꾸', text: '어? 짜루야! 진짜 안 다치고 잘 다녀왔구나! 빈손은 아니겠지...?', state: 'idle' },
      { speaker: '짜루', text: '짜잔! 세부 바닷속 가장 신비로운 곳에서 수확한 한 알의 "궁극의 황금 망고"야! 🥭💎✨', state: 'happy' },
      { speaker: '꾸꾸', text: '우와아...! 눈부셔! 정말 향기롭고 잘 익은 망고야! 날 위해 진짜로 찾아오다니... 감동이야... 🥹', state: 'happy' },
      { speaker: '짜루', text: '꾸꾸야, 그동안 내 부족함으로 아프게 했던 슬픔들을, 이 달콤한 망고와 내 사랑으로 모두 행복으로 가득 채워줄게. 🧡', state: 'happy' },
      { speaker: '꾸꾸', text: '냠냠... 진짜 역대급으로 달다! 헤헤, 짜루야 나 화 다 풀렸어! 우리 이제 사이좋게 지내자! 사랑해! 🥰❤️', state: 'happy' },
      { speaker: '짜루', text: '나도 항상 너무 많이 사랑해 꾸꾸야. 아내바라기 짜루의 진심을 담은 러브레터도 꼭 읽어줘! 💌', state: 'happy' }
    ];

    this.storyIndex = 0;
    this.isEpilogue = false;

    // 이벤트 리스너 바인딩 및 셋업
    this.initEvents();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  // 4. 캔버스 해상도 맞춤 처리
  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    // 초기화 배치
    if (this.currentScene === 'GAMEPLAY') {
      this.initPlayerPosition();
    }
  }

  initPlayerPosition() {
    this.player.width = this.canvas.width * 0.16;
    this.player.height = this.player.width;
    
    if (this.currentStage === 1) {
      // 1스테이지: 바닥 중앙 배치
      this.player.x = this.canvas.width / 2 - this.player.width / 2;
      this.player.y = this.canvas.height * 0.78;
    } else if (this.currentStage === 2) {
      // 2스테이지: 왼쪽에 둥실 떠 있는 벌룬 카트
      this.player.x = this.canvas.width * 0.15;
      this.player.y = this.canvas.height / 2;
      this.player.vy = 0;
    } else if (this.currentStage === 3) {
      // 3스테이지: 잠수 씬, 물속 중앙 왼쪽 배치
      this.player.x = this.canvas.width * 0.18;
      this.player.y = this.canvas.height * 0.3;
      this.player.vy = 0;
    }
  }

  // 5. 유저 입력 및 버튼 바인딩
  initEvents() {
    // 1. 모험 시작 버튼
    document.getElementById('btn-start-game').addEventListener('click', () => {
      audio.init();
      this.changeScene('PROLOGUE');
    });

    // 2. 사운드 토글 버튼
    const soundBtn = document.getElementById('btn-sound-toggle');
    soundBtn.addEventListener('click', () => {
      audio.toggleMute(soundBtn);
    });

    // 3. 대화창 터치 연동
    const storyScreen = document.getElementById('screen-story');
    storyScreen.addEventListener('click', (e) => {
      // 버튼 자체 클릭인 경우 오작동 방지
      if (e.target.closest('#btn-sound-toggle')) return;
      this.nextDialogue();
    });

    // 4. 월드맵 스테이지 출발 버튼
    document.getElementById('btn-start-stage').addEventListener('click', () => {
      this.startStagePlay();
    });

    // 5. 편지 화면 끝 재시작 버튼
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.currentStage = 1;
      this.isEpilogue = false;
      this.storyIndex = 0;
      this.stageKeysCollected = 0;
      this.changeScene('INTRO');
    });

    // 6. 가상 패드 터치 입력 연동
    const btnL = document.getElementById('btn-left');
    const btnR = document.getElementById('btn-right');

    const handlePressLeft = (e) => { e.preventDefault(); this.keys.left = true; };
    const handleReleaseLeft = (e) => { e.preventDefault(); this.keys.left = false; };
    const handlePressRight = (e) => { e.preventDefault(); this.keys.right = true; };
    const handleReleaseRight = (e) => { e.preventDefault(); this.keys.right = false; };

    btnL.addEventListener('mousedown', handlePressLeft);
    btnL.addEventListener('mouseup', handleReleaseLeft);
    btnL.addEventListener('touchstart', handlePressLeft, {passive: false});
    btnL.addEventListener('touchend', handleReleaseLeft, {passive: false});

    btnR.addEventListener('mousedown', handlePressRight);
    btnR.addEventListener('mouseup', handleReleaseRight);
    btnR.addEventListener('touchstart', handlePressRight, {passive: false});
    btnR.addEventListener('touchend', handleReleaseRight, {passive: false});

    // 화면 터치로 날아오르기/점프 (2스테이지 및 3스테이지)
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.keys.touch = true;
      if (this.currentScene === 'GAMEPLAY') {
        if (this.currentStage === 2) {
          // 벌룬 점프
          this.player.vy = -Math.max(6, this.canvas.height * 0.012);
          audio.playJump();
        }
      }
    }, {passive: false});

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.keys.touch = false;
    });

    // 마우스 마우스다운도 동일하게 터치 시뮬레이션 지원
    this.canvas.addEventListener('mousedown', (e) => {
      this.keys.touch = true;
      if (this.currentScene === 'GAMEPLAY' && this.currentStage === 2) {
        this.player.vy = -Math.max(6, this.canvas.height * 0.012);
        audio.playJump();
      }
    });
    this.canvas.addEventListener('mouseup', () => {
      this.keys.touch = false;
    });

    // 키보드 방향키 보조 (PC 테스트 대응)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = true;
      if (e.key === 'ArrowRight') this.keys.right = true;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        this.keys.touch = true;
        if (this.currentScene === 'GAMEPLAY' && this.currentStage === 2) {
          this.player.vy = -Math.max(6, this.canvas.height * 0.012);
          audio.playJump();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = false;
      if (e.key === 'ArrowRight') this.keys.right = false;
      if (e.key === ' ' || e.key === 'ArrowUp') this.keys.touch = false;
    });
  }

  // 6. 씬(화면) 변경 핸들러
  changeScene(sceneName) {
    this.currentScene = sceneName;
    
    // 모든 화면 비활성화
    document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));
    
    // 특정 화면 활성화
    let activeScreenId = '';
    switch (sceneName) {
      case 'INTRO':
        activeScreenId = 'screen-intro';
        break;
      case 'PROLOGUE':
      case 'EPILOGUE':
        activeScreenId = 'screen-story';
        this.isEpilogue = (sceneName === 'EPILOGUE');
        this.storyIndex = 0;
        this.setupStoryView();
        break;
      case 'MAP':
        activeScreenId = 'screen-map';
        this.setupMapView();
        break;
      case 'GAMEPLAY':
        activeScreenId = 'screen-gameplay';
        this.setupGameplayView();
        break;
      case 'LETTER':
        activeScreenId = 'screen-letter';
        break;
    }
    
    if (activeScreenId) {
      document.getElementById(activeScreenId).classList.add('active');
    }
  }

  // 7. 대화창 셋업 및 처리
  setupStoryView() {
    const badge = document.getElementById('story-stage-badge');
    badge.innerText = this.isEpilogue ? '에필로그 - 황금 망고' : '프롤로그 - 짜루의 반성';
    
    const bgLayer = document.getElementById('story-bg-layer');
    if (this.isEpilogue) {
      bgLayer.style.backgroundImage = "url('assets/background_ending.png')";
    } else {
      bgLayer.style.backgroundImage = "url('assets/background_intro.png')";
    }
    
    this.showDialogueLine();
  }

  showDialogueLine() {
    const script = this.isEpilogue ? this.epilogueScript : this.prologueScript;
    const currentLine = script[this.storyIndex];
    
    if (!currentLine) return;
    
    // 발화자 노출
    const speakerEl = document.getElementById('dialogue-speaker');
    speakerEl.innerText = currentLine.speaker;
    speakerEl.style.color = currentLine.speaker === '짜루' ? 'var(--color-secondary)' : 'var(--color-primary)';
    
    // 대사 노출 (부드러운 줄글 타이핑 연출)
    const textEl = document.getElementById('dialogue-text');
    textEl.innerHTML = '';
    
    let charIndex = 0;
    const fullText = currentLine.text;
    
    clearInterval(this.typingTimer);
    this.typingTimer = setInterval(() => {
      if (charIndex < fullText.length) {
        textEl.innerHTML += fullText.charAt(charIndex);
        charIndex++;
      } else {
        clearInterval(this.typingTimer);
      }
    }, 28);
    
    // 캐릭터 액티브 표정 연출
    const leftChar = document.getElementById('story-char-jjaru');
    const rightChar = document.getElementById('story-char-kkukku');
    
    if (currentLine.speaker === '짜루') {
      leftChar.classList.add('active');
      rightChar.classList.remove('active');
      // 짜루 스프라이트 표정 변경
      const sprite = leftChar.querySelector('.char-sprite');
      sprite.style.transform = currentLine.state === 'sad' ? 'scaleY(0.95)' : 'scaleY(1.0)';
    } else {
      leftChar.classList.remove('active');
      rightChar.classList.add('active');
    }
  }

  nextDialogue() {
    // 글 타이핑 중 터치 시 타이핑 건너뛰고 전체 텍스트 즉시 출력
    const script = this.isEpilogue ? this.epilogueScript : this.prologueScript;
    const currentLine = script[this.storyIndex];
    const textEl = document.getElementById('dialogue-text');
    
    if (textEl.innerHTML.length < currentLine.text.length) {
      clearInterval(this.typingTimer);
      textEl.innerHTML = currentLine.text;
      return;
    }
    
    this.storyIndex++;
    
    if (this.storyIndex < script.length) {
      this.showDialogueLine();
    } else {
      // 대화 종료 후
      if (this.isEpilogue) {
        // 에필로그 대사 완료 시 최종 아내 편지 화면으로 이동
        audio.playSuccess();
        this.changeScene('LETTER');
      } else {
        // 프롤로그 완료 시 월드맵 화면으로 이동
        this.changeScene('MAP');
      }
    }
  }

  // 8. 월드맵 스테이지 연출 및 경로 이동
  setupMapView() {
    const btnPlay = document.getElementById('btn-start-stage');
    const mapJjaru = document.getElementById('map-jjaru-player');
    
    // 완성 노드 체크 및 텍스트 갱신
    document.querySelectorAll('.map-node').forEach(node => {
      const nodeStage = parseInt(node.getAttribute('data-stage'));
      node.classList.remove('active', 'completed');
      
      if (nodeStage < this.currentStage) {
        node.classList.add('completed');
      } else if (nodeStage === this.currentStage) {
        node.classList.add('active');
      }
    });
    
    // 짜루 미니 캐릭터의 맵 상 꼬마 아이콘 수직 위치 조정
    const mapContainer = document.querySelector('.map-route-container');
    const nodes = document.querySelectorAll('.map-node');
    const targetNode = document.getElementById(
      this.currentStage === 1 ? 'node-france' :
      this.currentStage === 2 ? 'node-italy' :
      this.currentStage === 3 ? 'node-cebu' : 'node-ending'
    );
    
    if (targetNode && mapContainer) {
      const containerRect = mapContainer.getBoundingClientRect();
      const nodeRect = targetNode.getBoundingClientRect();
      const relativeTop = nodeRect.top - containerRect.top + (nodeRect.height / 2) - 15;
      
      mapJjaru.style.top = `${relativeTop}px`;
    }

    // 맵 문구 조정
    if (this.currentStage === 1) {
      btnPlay.innerText = '프랑스 파리로 출발! 🥖';
    } else if (this.currentStage === 2) {
      btnPlay.innerText = '이탈리아 토스카나로 출발! 🍇';
    } else if (this.currentStage === 3) {
      btnPlay.innerText = '필리핀 세부 바다로 출발! 🏝️';
    } else if (this.currentStage === 4) {
      btnPlay.innerText = '망고 들고 꾸꾸에게 돌아가기 🥭';
    }
  }

  // 9. 게임 시작 전 준비 (HUD 갱신 등)
  startStagePlay() {
    if (this.currentStage === 4) {
      // 게임을 다 깨고 망고 아일랜드 노드 도달 시 에필로그 대화로 진입
      this.changeScene('EPILOGUE');
    } else {
      this.changeScene('GAMEPLAY');
    }
  }

  setupGameplayView() {
    this.score = 0;
    this.lives = 3;
    this.isGameOver = false;
    this.isStageClear = false;
    this.items = [];
    this.obstacles = [];
    this.particles = [];
    this.backgroundX = 0;
    this.distanceTraveled = 0;
    this.stageKeysCollected = 0;

    this.initPlayerPosition();

    // 스테이지별 HUD 표시기 정의
    const hudItemName = document.getElementById('hud-item-name');
    if (this.currentStage === 1) {
      hudItemName.innerText = '🥖 크로아상';
      document.getElementById('game-stage-title').innerText = '1. 프랑스 파리';
      document.getElementById('controls-catcher').classList.remove('hidden');
      document.getElementById('controls-jumper').classList.add('hidden');
      document.getElementById('controls-diver').classList.add('hidden');
    } else if (this.currentStage === 2) {
      hudItemName.innerText = '🍇 포도별';
      document.getElementById('game-stage-title').innerText = '2. 이탈리아 토스카나';
      document.getElementById('controls-catcher').classList.add('hidden');
      document.getElementById('controls-jumper').classList.remove('hidden');
      document.getElementById('controls-diver').classList.add('hidden');
    } else if (this.currentStage === 3) {
      hudItemName.innerText = '🔑 황금 열쇠';
      document.getElementById('game-stage-title').innerText = '3. 필리핀 세부';
      document.getElementById('controls-catcher').classList.add('hidden');
      document.getElementById('controls-jumper').classList.add('hidden');
      document.getElementById('controls-diver').classList.remove('hidden');
    }

    this.updateHUD();
    
    // 스테이지 배경화면 준비
    this.bgImageObj = new Image();
    this.bgImageObj.src = this.bgImages[this.currentStage];
  }

  updateHUD() {
    if (this.currentStage === 3) {
      document.getElementById('hud-score').innerText = `${this.stageKeysCollected} / 3`;
    } else {
      document.getElementById('hud-score').innerText = `${this.score} / ${this.targetScore}`;
    }
    
    let lifeStr = '';
    for (let i = 0; i < 3; i++) {
      lifeStr += i < this.lives ? '❤️' : '🖤';
    }
    document.getElementById('hud-life').innerText = lifeStr;
  }

  // 10. 코어 게임 루프 프레임 틱
  tick() {
    this.frame++;
    
    if (this.currentScene === 'GAMEPLAY') {
      this.updatePhysics();
      this.drawGame();
    } else {
      // 씬이 대기 상태일 때 백그라운드 프리뷰 애니메이션 지원
      this.drawStaticPreviews();
    }
    
    requestAnimationFrame(() => this.tick());
  }

  // 11. 게임 내 물리 및 로직 업데이트
  updatePhysics() {
    if (this.isGameOver || this.isStageClear) return;

    // ----------------------------------------------------
    // [Stage 1] 프랑스 파리: 빵 바구니 받기 (좌우 터치 이동)
    // ----------------------------------------------------
    if (this.currentStage === 1) {
      const speed = this.canvas.width * 0.015;
      
      // 입력에 다른 좌우 슬라이드
      if (this.keys.left) {
        this.player.x -= speed;
        this.player.vx = -1;
      } else if (this.keys.right) {
        this.player.x += speed;
        this.player.vx = 1;
      } else {
        this.player.vx = 0;
      }
      
      // 경계 제한
      if (this.player.x < 0) this.player.x = 0;
      if (this.player.x > this.canvas.width - this.player.width) {
        this.player.x = this.canvas.width - this.player.width;
      }

      // 떨어지는 크로아상/마카롱/하트 생성
      if (this.frame % 38 === 0) {
        this.items.push({
          x: Math.random() * (this.canvas.width - 30) + 15,
          y: -30,
          vy: Math.random() * 2 + 3.5,
          size: Math.random() * 8 + 26,
          type: Math.random() > 0.35 ? 'croissant' : 'heart'
        });
      }

      // 낙하 및 충돌 체크
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        item.y += item.vy;
        
        // 장바구니와 충돌 체크
        if (
          item.y + item.size >= this.player.y &&
          item.x + item.size >= this.player.x &&
          item.x <= this.player.x + this.player.width &&
          item.y <= this.player.y + this.player.height
        ) {
          // 파티클 생성
          this.createHeartParticles(item.x, item.y, item.type === 'heart' ? '#ff7675' : '#fdcb6e');
          
          this.items.splice(i, 1);
          audio.playChime();
          
          this.score++;
          this.updateHUD();
          
          if (this.score >= this.targetScore) {
            this.triggerStageClear();
          }
          continue;
        }

        // 바닥 이탈
        if (item.y > this.canvas.height) {
          this.items.splice(i, 1);
        }
      }
    }

    // ----------------------------------------------------
    // [Stage 2] 이탈리아 토스카나: 힐링 벌룬 비행 (점프 장애물 피하기)
    // ----------------------------------------------------
    else if (this.currentStage === 2) {
      // 횡스크롤 처리
      this.backgroundX -= 1.8;
      this.distanceTraveled += 2;
      
      // 플레이어 중력 작용
      this.player.vy += this.player.gravity;
      this.player.y += this.player.vy;
      
      // 화면 경계 제한
      if (this.player.y < 50) {
        this.player.y = 50;
        this.player.vy = 0;
      }
      if (this.player.y > this.canvas.height * 0.72) {
        this.player.y = this.canvas.height * 0.72;
        this.player.vy = 0;
      }

      // 우측에서 토스카나 포도별 생성
      if (this.frame % 48 === 0) {
        this.items.push({
          x: this.canvas.width + 30,
          y: Math.random() * (this.canvas.height * 0.4) + this.canvas.height * 0.18,
          size: 28,
          type: 'grape'
        });
      }

      // 방해물 비구름 생성
      if (this.frame % 90 === 0) {
        this.obstacles.push({
          x: this.canvas.width + 50,
          y: Math.random() * (this.canvas.height * 0.42) + this.canvas.height * 0.18,
          size: Math.random() * 15 + 45,
          speed: Math.random() * 1 + 2.5
        });
      }

      // 획득용 아이템 업데이트
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        item.x -= 2.2;
        
        // 충돌 체크
        if (this.checkCollision(this.player, item)) {
          this.createHeartParticles(item.x, item.y, '#fdcb6e');
          this.items.splice(i, 1);
          audio.playChime();
          this.score++;
          this.updateHUD();
          
          if (this.score >= this.targetScore) {
            this.triggerStageClear();
          }
          continue;
        }
        
        if (item.x < -30) this.items.splice(i, 1);
      }

      // 장애물(비구름) 업데이트
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.x -= obs.speed;
        
        // 충돌 체크
        if (this.checkCollision(this.player, obs)) {
          this.obstacles.splice(i, 1);
          audio.playHurt();
          this.lives--;
          this.updateHUD();
          
          if (this.lives <= 0) {
            this.triggerGameOver();
          }
          continue;
        }
        
        if (obs.x < -100) this.obstacles.splice(i, 1);
      }
    }

    // ----------------------------------------------------
    // [Stage 3] 필리핀 세부: 스노클링 심해 잠수 (열쇠 모으기)
    // ----------------------------------------------------
    else if (this.currentStage === 3) {
      this.backgroundX -= 1.2;

      // 터치 시 잠수, 때면 부력으로 상승
      if (this.keys.touch) {
        this.player.vy = Math.min(this.player.vy + 0.35, 4.5);
      } else {
        this.player.vy = Math.max(this.player.vy - 0.28, -3.8);
      }

      this.player.y += this.player.vy;

      // 수면 및 바닥 경계 제한
      if (this.player.y < this.canvas.height * 0.15) {
        this.player.y = this.canvas.height * 0.15;
        this.player.vy = 0;
      }
      if (this.player.y > this.canvas.height * 0.8) {
        this.player.y = this.canvas.height * 0.8;
        this.player.vy = 0;
      }

      // 조개 아이템 및 특별 황금 망고 열쇠 배치
      if (this.frame % 60 === 0) {
        const isKey = this.stageKeysCollected < 3 && Math.random() > 0.68;
        this.items.push({
          x: this.canvas.width + 30,
          y: Math.random() * (this.canvas.height * 0.55) + this.canvas.height * 0.2,
          size: isKey ? 36 : 28,
          type: isKey ? 'key' : 'shell'
        });
      }

      // 장애물 성게(Sea Urchins) 생성
      if (this.frame % 110 === 0) {
        this.obstacles.push({
          x: this.canvas.width + 40,
          y: Math.random() * (this.canvas.height * 0.52) + this.canvas.height * 0.22,
          size: 32,
          speed: 2.2
        });
      }

      // 아이템 수집 업데이트
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        item.x -= 2.0;

        if (this.checkCollision(this.player, item)) {
          audio.playChime();
          this.items.splice(i, 1);
          
          if (item.type === 'key') {
            this.stageKeysCollected++;
            this.createHeartParticles(item.x, item.y, '#ffd700');
          } else {
            this.createHeartParticles(item.x, item.y, '#81ecec');
          }
          this.updateHUD();

          if (this.stageKeysCollected >= 3) {
            this.triggerStageClear();
          }
          continue;
        }

        if (item.x < -40) this.items.splice(i, 1);
      }

      // 장애물 성게 업데이트
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.x -= obs.speed;

        if (this.checkCollision(this.player, obs)) {
          this.obstacles.splice(i, 1);
          audio.playHurt();
          this.lives--;
          this.updateHUD();

          if (this.lives <= 0) {
            this.triggerGameOver();
          }
          continue;
        }

        if (obs.x < -40) this.obstacles.splice(i, 1);
      }
    }

    // 파티클 물리 업데이트
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.035;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  // 간단한 원형 충돌 판정
  checkCollision(rect, circle) {
    const rx = rect.x + rect.width / 2;
    const ry = rect.y + rect.height / 2;
    const dist = Math.hypot(rx - circle.x, ry - circle.y);
    return dist < (rect.width * 0.45 + circle.size * 0.5);
  }

  createHeartParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        alpha: 1.0,
        color: color,
        size: Math.random() * 5 + 4
      });
    }
  }

  // 12. 전체 화면 그래픽 드로잉
  drawGame() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. 패럴랙스 무한스크롤 배경화면 그리기
    if (this.bgImageObj && this.bgImageObj.complete) {
      // 1스테이지는 고정 화면, 2,3스테이지는 흐르는 배경화면 연출
      const bgSpeedX = this.currentStage === 1 ? 0 : this.backgroundX % this.canvas.width;
      
      this.ctx.drawImage(this.bgImageObj, bgSpeedX, 0, this.canvas.width, this.canvas.height);
      if (bgSpeedX < 0) {
        this.ctx.drawImage(this.bgImageObj, bgSpeedX + this.canvas.width, 0, this.canvas.width, this.canvas.height);
      }
    } else {
      // 미로딩 대비 대체 파스텔 그라디언트
      const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      grad.addColorStop(0, '#74b9ff');
      grad.addColorStop(1, '#dfe6e9');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 2. 스테이지별 요소 드로잉
    if (this.currentStage === 1) {
      // 프랑스 테마: 바닥에 낭만적인 에펠탑 실루엣 보조 드로잉 또는 꽃길
      this.ctx.fillStyle = '#ff7675';
      this.ctx.globalAlpha = 0.25;
      this.ctx.font = '72px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('🗼', this.canvas.width * 0.76, this.canvas.height * 0.45);
      this.ctx.globalAlpha = 1.0;
    } 
    else if (this.currentStage === 3) {
      // 세부 바다: 잔잔한 수면 물결 가이드선 표현
      this.ctx.fillStyle = 'rgba(0, 206, 201, 0.25)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.16);
    }

    // 3. 수집용 아이템 그리기
    this.items.forEach(item => {
      this.ctx.save();
      this.ctx.shadowColor = item.type === 'key' ? '#ffd700' : 'rgba(0,0,0,0.1)';
      this.ctx.shadowBlur = 10;
      
      this.ctx.font = `${item.size}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      let icon = '🥐';
      if (item.type === 'heart') icon = '❤️';
      else if (item.type === 'grape') icon = '🍇';
      else if (item.type === 'shell') icon = '🐚';
      else if (item.type === 'key') icon = '🔑';
      
      this.ctx.fillText(icon, item.x, item.y);
      this.ctx.restore();
    });

    // 4. 장애물 그리기
    this.obstacles.forEach(obs => {
      this.ctx.save();
      this.ctx.font = `${obs.size}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      let icon = this.currentStage === 2 ? '☁️' : '🐙'; // 토스카나 비구름, 세부 성게(문어)
      this.ctx.fillText(icon, obs.x, obs.y);
      this.ctx.restore();
    });

    // 5. 파티클 그리기
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.font = `${p.size * 2}px sans-serif`;
      this.ctx.fillText('♥', p.x, p.y);
      this.ctx.restore();
    });

    // 6. 플레이어 캐릭터 (짜루) 렌더링
    const charState = this.isGameOver ? 'sad' : (this.keys.left || this.keys.right || this.currentStage > 1) ? 'walk' : 'idle';
    
    // 점프 중일 때 약간 기울어짐 효과
    if (this.currentStage === 2 && this.player.vy < -1) {
      this.player.angle = -0.15;
    } else if (this.currentStage === 2 && this.player.vy > 1) {
      this.player.angle = 0.1;
    } else {
      this.player.angle = 0;
    }

    const rx = this.player.x + this.player.width / 2;
    const ry = this.player.y + this.player.height / 2;
    
    this.ctx.save();
    if (this.player.angle !== 0) {
      this.ctx.translate(rx, ry);
      this.ctx.rotate(this.player.angle);
      this.ctx.translate(-rx, -ry);
    }
    
    CharacterRenderer.drawJjaru(
      this.ctx, 
      rx, 
      ry, 
      charState, 
      this.player.width, 
      this.frame
    );
    this.ctx.restore();

    // 7. 디버그/오버레이 및 게임 진행 상태 텍스트
    if (this.isGameOver) {
      this.drawModal('게임 오버 😭', '화면을 터치해서 다시 도전해요!', '#e74c3c');
    } else if (this.isStageClear) {
      this.drawModal('스테이지 완료! 🎉', '화면을 클릭해서 다음으로 진행하세요!', 'var(--color-accent)');
    }
  }

  // 모달 안내 오버레이 그리기
  drawModal(title, subtitle, color) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // 메인 제목
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 32px var(--font-title)';
    this.ctx.fillText(title, this.canvas.width / 2, this.canvas.height * 0.44);

    // 보조 안내
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '18px var(--font-cute)';
    this.ctx.fillText(subtitle, this.canvas.width / 2, this.canvas.height * 0.52);
    this.ctx.restore();
  }

  // 13. 게임 실패 및 성공 트리거
  triggerGameOver() {
    this.isGameOver = true;
    this.canvas.addEventListener('click', () => this.restartCurrentStage(), { once: true });
  }

  restartCurrentStage() {
    this.setupGameplayView();
  }

  triggerStageClear() {
    this.isStageClear = true;
    audio.playSuccess();
    
    // 스테이지가 끝나면 캔버스 클릭 시 월드맵 노드로 복귀
    this.canvas.addEventListener('click', () => {
      this.currentStage++;
      this.changeScene('MAP');
    }, { once: true });
  }

  // 14. 메인 화면 미리보기 드로잉 (정적 상태 짜루와 꾸꾸 애니메이션 연동)
  drawStaticPreviews() {
    const previewJjaru = document.getElementById('preview-jjaru');
    const previewKkukku = document.getElementById('preview-kkukku');
    
    if (previewJjaru && previewKkukku && this.frame % 3 === 0) {
      // 인트로 화면에서 꼬물꼬물 거리는 미니 짜루/꾸꾸 그리기
      this.renderPreviewDOMCharacter(previewJjaru, 'jjaru');
      this.renderPreviewDOMCharacter(previewKkukku, 'kkukku');
    }

    // 스토리(대화창) 씬에서 캐릭터 동적 캔버스 렌더링 지원 (누락 버그 해결)
    if (this.currentScene === 'PROLOGUE' || this.currentScene === 'EPILOGUE') {
      const storyJjaru = document.querySelector('#story-char-jjaru .char-sprite');
      const storyKkukku = document.querySelector('#story-char-kkukku .char-sprite');
      if (storyJjaru && storyKkukku && this.frame % 3 === 0) {
        const script = this.isEpilogue ? this.epilogueScript : this.prologueScript;
        const currentLine = script[this.storyIndex];
        
        let jjaruState = 'idle';
        let kkukkuState = 'idle';
        
        if (currentLine) {
          if (currentLine.speaker === '짜루') {
            jjaruState = currentLine.state || 'idle';
          } else {
            kkukkuState = currentLine.state || 'idle';
          }
        }
        
        this.renderStoryDOMCharacter(storyJjaru, 'jjaru', jjaruState);
        this.renderStoryDOMCharacter(storyKkukku, 'kkukku', kkukkuState);
      }
    }
  }

  renderStoryDOMCharacter(el, charType, state) {
    const canvasId = `canvas-story-${charType}`;
    let canvas = document.getElementById(canvasId);
    
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = canvasId;
      canvas.width = 150;
      canvas.height = 175;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      el.innerHTML = '';
      el.appendChild(canvas);
    }
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (charType === 'jjaru') {
      CharacterRenderer.drawJjaru(ctx, 75, 80, state, 115, this.frame);
    } else {
      CharacterRenderer.drawKkukku(ctx, 75, 83, state, 110, this.frame);
    }
  }

  renderPreviewDOMCharacter(el, charType) {
    const canvasId = `canvas-preview-${charType}`;
    let canvas = document.getElementById(canvasId);
    
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = canvasId;
      canvas.width = 110;
      canvas.height = 110;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      el.innerHTML = '';
      el.appendChild(canvas);
    }
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (charType === 'jjaru') {
      CharacterRenderer.drawJjaru(ctx, 55, 50, 'idle', 75, this.frame);
    } else {
      CharacterRenderer.drawKkukku(ctx, 55, 52, 'idle', 72, this.frame);
    }
  }
}

// 15. 페이지 로드와 동시에 초기 구동 예약
window.addEventListener('DOMContentLoaded', () => {
  const game = new ApologyGame();
  
  // 마이크로 애니메이션 렌더 틱 가동
  game.tick();
});
