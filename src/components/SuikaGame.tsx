import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

interface FruitData {
  id: number;
  name: string;
  radius: number;
  color: string;
  borderColor: string;
  isCustomShape?: boolean;
  imageFile: string;
  imgW: number;
  imgH: number;
}

const FRUIT_TYPES: FruitData[] = [
  { id: 1, name: '체리', radius: 13, color: '#FF3333', borderColor: '#CC0000', imageFile: '1_cherry.png?v=2', imgW: 513, imgH: 684 },
  { id: 2, name: '딸기', radius: 20, color: '#FF5E7E', borderColor: '#D94361', imageFile: '2_strawberry.png?v=2', imgW: 504, imgH: 618 },
  { id: 3, name: '포도', radius: 28, color: '#A066FF', borderColor: '#7A49D1', imageFile: '3_grape.png?v=2', imgW: 570, imgH: 794 },
  { id: 4, name: '귤', radius: 34, color: '#FFCC00', borderColor: '#E6B800', imageFile: '4_tangerine_v3.png', imgW: 638, imgH: 720 },
  { id: 5, name: '감', radius: 42, color: '#FF8533', borderColor: '#D9651A', imageFile: '5_persimmon.png?v=2', imgW: 658, imgH: 659 },
  { id: 6, name: '사과', radius: 52, color: '#FF4D4D', borderColor: '#CC3333', imageFile: '6_apple.png?v=2', imgW: 560, imgH: 628 },
  { id: 7, name: '배', radius: 60, color: '#FFE162', borderColor: '#D9BC41', imageFile: '7_pear.png?v=2', imgW: 620, imgH: 769 },
  { id: 8, name: '복숭아', radius: 72, color: '#FFADAD', borderColor: '#D98A8A', imageFile: '8_peach.png?v=2', imgW: 530, imgH: 594 },
  { id: 9, name: '파인애플', radius: 86, color: '#FFEC33', borderColor: '#D9C81A', imageFile: '9_pineapple_round.png', imgW: 612, imgH: 789 },
  { id: 10, name: '멜론', radius: 105, color: '#B2FF66', borderColor: '#8ACC4D', imageFile: '10_melon.png?v=2', imgW: 592, imgH: 690 },
  { id: 11, name: '수박', radius: 120, color: '#2DB400', borderColor: '#248F00', imageFile: '11_watermelon.png?v=2', imgW: 586, imgH: 681 },
];

const SuikaGame: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const [currentFruitIndex, setCurrentFruitIndex] = useState(() => Math.floor(Math.random() * 5));
  const [nextFruitIndex, setNextFruitIndex] = useState(() => Math.floor(Math.random() * 5));
  const [score, setScore] = useState(0);
  const [cloudX, setCloudX] = useState(250);
  const [isClickable, setIsClickable] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [scale, setScale] = useState(1);
  const gameOverTimerRef = useRef<number | null>(null);
  const [bgmStarted, setBgmStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const [suikaPop, setSuikaPop] = useState<{ x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmBufferRef = useRef<AudioBuffer | null>(null);
  const bgmSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);

  const playBgm = async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      if (!bgmBufferRef.current) {
        const response = await fetch(`${import.meta.env.BASE_URL}suika_new_bgm.mp3`);
        const arrayBuffer = await response.arrayBuffer();
        bgmBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
      }

      if (bgmSourceRef.current) {
        try { bgmSourceRef.current.stop(); } catch(e) {}
      }

      const source = ctx.createBufferSource();
      source.buffer = bgmBufferRef.current;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = isMuted ? 0 : 0.5;
      bgmGainRef.current = gain;

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);

      bgmSourceRef.current = source;
      setBgmStarted(true);
    } catch (e) {
      console.error('BGM play failed:', e);
    }
  };

  const playPopSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // 뽁! 소리: 짧은 사인파 + 빠른 피치 다운
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.45, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.13);
    } catch (e) {
      console.error('Pop sound failed', e);
    }
  };

  useEffect(() => {
    if (bgmGainRef.current && audioCtxRef.current) {
      bgmGainRef.current.gain.setTargetAtTime(isMuted ? 0 : 0.5, audioCtxRef.current.currentTime, 0.1);
    }
  }, [isMuted]);

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      // 게임 캔버스는 500 x 650. 점수 배너(내부 배치), 상하 여백 등 고려.
      const CANVAS_W = 500;
      const CANVAS_H = 650;
      const EXTRA_V = 20; // 상단 버튼/여백 최소화
      
      const scaleByW = screenWidth < CANVAS_W + 20 ? screenWidth / (CANVAS_W + 20) : 1;
      const scaleByH = screenHeight < CANVAS_H + EXTRA_V ? screenHeight / (CANVAS_H + EXTRA_V) : 1;
      setScale(Math.min(scaleByW, scaleByH));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      // 폼 요소 등을 제외하고는 기본 스크롤 동작을 완전히 무시하도록 설정
      if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    // iOS Safari 등에서 스크롤을 막기 위해 passive: false 설정 필수
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // 개발자 테스트 모드: 키보드 단축키로 과일 즉시 변경
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key >= '1' && key <= '9') {
        setCurrentFruitIndex(parseInt(key) - 1);
      } else if (key === '0') {
        setCurrentFruitIndex(9); // 멜론
      } else if (key === 'w') {
        setCurrentFruitIndex(10); // 수박
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const runnerRef = useRef<Matter.Runner | null>(null);

  useEffect(() => {
    if (isGameOver && runnerRef.current) {
      Matter.Runner.stop(runnerRef.current);
    }
  }, [isGameOver]);

  const DEADLINE_Y = 110;

  useEffect(() => {
    if (!sceneRef.current) return;

    const engine = Matter.Engine.create();
    engineRef.current = engine;
    engine.gravity.y = 1.2;
    // 과일이 바닥/벽을 뚫고 나가지 않도록 엔진 충돌 정밀도 대폭 향상
    engine.positionIterations = 20;
    engine.velocityIterations = 20;

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: 500,
        height: 650,
        wireframes: false,
        background: 'transparent',
      },
    });

    // 🔥 확실한 레이어 보장을 위해 캔버스 엘리먼트에 직접 스타일 및 z-index 강제 주입
    if (render.canvas) {
      render.canvas.style.position = 'absolute';
      render.canvas.style.top = '0';
      render.canvas.style.left = '0';
      render.canvas.style.zIndex = '20';
      render.canvas.style.pointerEvents = 'none';
      render.canvas.style.backgroundColor = 'transparent';
    }

    const glassOptions = {
      isStatic: true,
      friction: 0.1,
      restitution: 0.2,
      render: { fillStyle: '#FFFFFF55', strokeStyle: '#B2EBF2', lineWidth: 4 }
    };

    const containerWidth = 440; // 수박 두 개(지름 220x2)가 들어갈 수 있도록 440으로 확장
    const containerHeight = 550;
    const centerX = 250;
    const centerY = 370;

    // 📦 투명 직사각형 상자 물리 구조 구축 (원작 고증)
    const wallThickness = 20; // 사용자의 요청에 따라 벽을 얇게 변경
    const potWalls = [
      // 하단 베이스 (평평한 바닥)
      Matter.Bodies.rectangle(centerX, centerY + containerHeight/2 + wallThickness/2, containerWidth + wallThickness * 2, wallThickness, {
        isStatic: true,
        friction: 0.5,
        render: { fillStyle: '#FFE4B5', strokeStyle: '#DEB887', lineWidth: 4 }, // 우드/베이지 톤
        label: 'wall'
      }),
      // 좌측 수직 벽
      Matter.Bodies.rectangle(centerX - containerWidth/2 - wallThickness/2, centerY, wallThickness, containerHeight, {
        ...glassOptions, label: 'wall_left'
      }),
      // 우측 수직 벽
      Matter.Bodies.rectangle(centerX + containerWidth/2 + wallThickness/2, centerY, wallThickness, containerHeight, {
        ...glassOptions, label: 'wall_right'
      }),
    ];

    Matter.Composite.add(engine.world, potWalls);

    // AudioContext 초기화 헬퍼
    const getAudioCtx = () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };

    // Web Audio API를 이용한 합치기(Merge) 효과음 생성 함수
    const playMergeSound = (typeIndex: number) => {
      try {
        const audioCtx = getAudioCtx();
        if (!audioCtx) return;

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // 과일이 클수록(typeIndex가 클수록) 조금 더 낮고 묵직한 소리
        const baseFreq = 600 - (typeIndex * 30);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioCtx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } catch (e) {
        console.error('Audio play failed', e);
      }
    };

    // 과일 착지 효과음 (과일이 벽/바닥에 닿을 때)
    const playDropSound = (typeIndex: number, speed: number) => {
      try {
        const audioCtx = getAudioCtx();
        if (!audioCtx) return;

        // 충돌 속도에 따른 볼륨 (너무 느리면 소리 안냄)
        const volume = Math.min(speed / 8, 1) * 0.35;
        if (volume < 0.03) return;

        // 노이즈 버퍼 생성 (퍽/통 소리)
        const bufferSize = audioCtx.sampleRate * 0.08;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;

        // 과일 크기에 따라 주파수 필터 조정 (클수록 낮고 묵직하게)
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = Math.max(80, 300 - typeIndex * 18);
        filter.Q.value = 1.5;

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start();
      } catch (e) {
        console.error('Drop sound failed', e);
      }
    };

    // 수박 합치기 전용 웅장한 사운드
    const playSuikaSpecialSound = () => {
      try {
        const audioCtx = getAudioCtx();
        if (!audioCtx) return;
        
        // 여러 주파수의 조화 (C-Major Chord 느낌)
        [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.type = i % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.5, audioCtx.currentTime + 1.5);
          
          gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
          
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 1.5);
        });
      } catch (e) {
        console.error('Suika sound failed', e);
      }
    };

    // 병합 로직 + 착지 효과음
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.label.startsWith('fruit_')) (bodyA as any).isNew = false;
        if (bodyB.label.startsWith('fruit_')) (bodyB as any).isNew = false;

        // 과일 합치기
        if (bodyA.label === bodyB.label && bodyA.label.startsWith('fruit_')) {
          const typeNum = parseInt(bodyA.label.split('_')[1]); // fruit_1 -> 1
          const typeIndex = typeNum - 1; // fruit_1 -> index 0
          
          // 점수 체계: 원래 설계 문서 기준 (1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66)
          const points = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];
          setScore(prev => prev + (points[typeIndex] || 0));
          
          playMergeSound(typeIndex);
          
          if (typeNum === 11) {
            console.log('%c🍉 SUIKA MERGE SUCCESS!!! 🍉', 'color: #ff0000; font-size: 20px; font-weight: bold;');
            playSuikaSpecialSound();
            
            // 화면 진동 트리거
            setIsShake(true);
            setTimeout(() => setIsShake(false), 400);

            // 부유 텍스트 위치 설정
            setSuikaPop({ x: bodyA.position.x, y: bodyA.position.y });
            setTimeout(() => setSuikaPop(null), 1500);

            // 수박 씨 파티클 버스트 (Matter.js)
            const particles: Matter.Body[] = [];
            for (let i = 0; i < 20; i++) {
              const p = Matter.Bodies.circle(
                (bodyA.position.x + bodyB.position.x) / 2,
                (bodyA.position.y + bodyB.position.y) / 2,
                Math.random() * 3 + 2,
                {
                  friction: 0.1,
                  restitution: 0.8,
                  label: 'particle',
                  collisionFilter: { group: -1, mask: 0 }, // 다른 물체와 충돌 안함
                  render: { fillStyle: '#331100' } // 수박 씨 색상
                }
              );
              const forceMagnitude = 0.01 * p.mass;
              const angle = Math.random() * Math.PI * 2;
              Matter.Body.applyForce(p, p.position, {
                x: Math.cos(angle) * forceMagnitude,
                y: Math.sin(angle) * forceMagnitude
              });
              particles.push(p);
            }
            Matter.Composite.add(engine.world, particles);
            // 2초 뒤 파티클 제거
            setTimeout(() => {
              Matter.Composite.remove(engine.world, particles);
            }, 2000);
          }

          Matter.Composite.remove(engine.world, [bodyA, bodyB]);
          if (typeNum < 11) {
            createFruit((bodyA.position.x + bodyB.position.x) / 2, (bodyA.position.y + bodyB.position.y) / 2, typeNum, engine.world, true);
          }
          return;
        }

        // 과일이 벽/바닥/다른 과일에 착지할 때 효과음
        const fruitBody = bodyA.label.startsWith('fruit_') ? bodyA
          : bodyB.label.startsWith('fruit_') ? bodyB
          : null;
        const otherBody = fruitBody === bodyA ? bodyB : bodyA;

        if (fruitBody && (otherBody.label === 'wall' || otherBody.label === 'wall_left' || otherBody.label === 'wall_right' || otherBody.label.startsWith('fruit_'))) {
          const typeIndex = parseInt(fruitBody.label.split('_')[1]) - 1;
          // 충돌 속도 계산
          const vel = fruitBody.velocity;
          const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
          playDropSound(typeIndex, speed);
        }
      });
    });

    // 게임 오버 감지
    Matter.Events.on(engine, 'afterUpdate', () => {
      if (isGameOver) return;
      
      let isAnyFruitOver = false;
      const bodies = Matter.Composite.allBodies(engine.world);
      
      for (const body of bodies) {
        if (body.label.startsWith('fruit_') && !(body as any).isNew) {
          const fruitRadius = FRUIT_TYPES[parseInt(body.label.split('_')[1]) - 1].radius;
          // 과일의 최상단 레벨이 DEADLINE_Y(180) 보다 높은 곳(y값이 작음)으로 넘어갔는지 확인
          if (body.position.y - fruitRadius < DEADLINE_Y) {
            isAnyFruitOver = true;
            break;
          }
        }
      }

      if (isAnyFruitOver) {
        // 타이머가 작동 중이 아니라면 2초 타이머 시작
        if (gameOverTimerRef.current === null) {
          gameOverTimerRef.current = window.setTimeout(() => {
            setIsGameOver(true);
          }, 2000);
        }
      } else {
        // 데드라인 아래로 다시 떨어졌다면 타이머 취소
        if (gameOverTimerRef.current !== null) {
          clearTimeout(gameOverTimerRef.current);
          gameOverTimerRef.current = null;
        }
      }
    });

    // Canvas 얼굴 렌더링 부분을 제거, 실제 이미지만 렌더링되도록 변경.

    Matter.Render.run(render);
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    return () => {
      if (gameOverTimerRef.current !== null) {
        clearTimeout(gameOverTimerRef.current);
      }
      Matter.Render.stop(render);
      Matter.Engine.clear(engine);
      Matter.Runner.stop(runner);
      render.canvas.remove();
    };
  }, []);

  const createFruit = (x: number, y: number, index: number, world: Matter.World, isMerge = false) => {
    const type = FRUIT_TYPES[index];
    // 원래 2.1에서는 스케일이 너무 커서 심하게 겹치고 바닥을 뚫는 현상이 있었고,
    // maxDim 기준에서는 너무 작아져서 공간이 붕 뜨는 현상이 발생했습니다.
    // 1.95를 너비 기준으로 적용하여, 가로가 딱 맞으면서 세로 겹침을 최소화하는 최적의 핏을 생성합니다.
    const scaleFactor = (type.radius * 1.95) / type.imgW; 

    const options: any = {
      label: `fruit_${index + 1}`,
      restitution: 0.3,
      friction: 0.1,
      mass: 1,
      isNew: !isMerge,
      render: {
        sprite: {
          texture: `${import.meta.env.BASE_URL}fruits/${type.imageFile}`,
          xScale: scaleFactor,
          yScale: scaleFactor
        }
      }
    };
    const fruit = type.isCustomShape
      ? Matter.Bodies.polygon(x, y, index === 1 ? 6 : 8, type.radius, options)
      : Matter.Bodies.circle(x, y, type.radius, options);
    if (isMerge) Matter.Body.applyForce(fruit, fruit.position, { x: 0, y: -0.01 });
    Matter.Composite.add(world, fruit);
    return fruit;
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isGameOver) return;
    const rect = sceneRef.current?.getBoundingClientRect();
    if (rect) {
      let clientX;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
      } else {
        clientX = (e as React.MouseEvent).clientX;
      }
      // 벽 안쪽 경계: 좌 30, 우 470 (containerWidth=440, centerX=250 기준)
      // 현재 과일 반지름만큼 안쪽으로 제한해 벽에 닿지 않도록 함
      const radius = FRUIT_TYPES[currentFruitIndex].radius;
      const minX = 30 + radius;
      const maxX = 470 - radius;
      setCloudX(Math.max(minX, Math.min(maxX, (clientX - rect.left) / scale)));
    }
  };

  const handleClick = () => {
    if (!bgmStarted && isGameStarted) {
      playBgm();
    }
    
    if (!isClickable || isGameOver || !engineRef.current) return;
    setIsClickable(false);
    playPopSound();
    createFruit(cloudX, 32, currentFruitIndex, engineRef.current.world);
    setTimeout(() => {
      // 새 과일로 변경
      setCurrentFruitIndex(nextFruitIndex);
      
      // 새 과일의 크기가 기존보다 클 수 있으므로 위치를 즉시 안전한 범위로 자동 이동
      const newRadius = FRUIT_TYPES[nextFruitIndex].radius;
      setCloudX(prevX => Math.max(30 + newRadius, Math.min(470 - newRadius, prevX)));
      
      setNextFruitIndex(Math.floor(Math.random() * 5));
      setIsClickable(true);
    }, 800);
  };

  return (
    <div className="relative flex flex-col items-center justify-start min-h-screen bg-[#FFF9E6] font-sans overflow-hidden pt-0">
      
      {/* 음소거 버튼이 진화의 고리 내부로 이동되었습니다. */}

      <div ref={containerRef} className={`relative flex flex-col lg:flex-row gap-4 lg:gap-8 items-center lg:items-start z-10 p-0 transform -translate-y-2 ${isShake ? 'animate-shake' : ''}`}>
        <div style={{ width: 500 * scale, height: 650 * scale }} className="relative shrink-0">
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 500, height: 650 }} className="absolute top-0 left-0 bg-white/10 rounded-b-[40px]">
            <div className="absolute top-4 left-4 px-4 py-1 bg-[#FF8080] text-white rounded-full shadow-lg border-2 border-white font-bold text-lg z-0 whitespace-nowrap">
              SCORE: {score}
            </div>
            {/* 이벤트 처리용 최상위 컨테이너 */}
            <div onMouseMove={handleMove} onTouchMove={handleMove} onTouchStart={handleMove} onTouchEnd={handleClick} onClick={handleClick} style={{ touchAction: 'none' }} className="relative w-[500px] h-[650px] cursor-none">
              
              {/* 수박 합치기 부유 텍스트 (화면 정중앙 고정) */}
              {suikaPop && (
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 text-white font-black text-6xl lg:text-7xl animate-bounce whitespace-nowrap drop-shadow-[0_0_30px_rgba(255,0,0,1)] uppercase"
                >
                  🍉 SUIKA!! 🍉
                </div>
              )}
              
              {/* 1. 구름 몸체 (z-10: 가장 뒤) */}
              <div className="absolute top-0 pointer-events-none z-10" style={{ left: `${cloudX}px` }}>
                <div className="absolute top-0 w-32 h-16 bg-white rounded-full shadow-md" style={{ left: '-30px' }}>
                  <div className="absolute -bottom-1 w-20 h-10 bg-white rounded-full left-1/2 -translate-x-1/2" />
                  <div className="absolute flex gap-2.5" style={{ bottom: '8px', left: '50%', transform: 'translateX(-50%)' }}>
                    <div className="w-2 h-2 bg-black/40 rounded-full" />
                    <div className="w-2 h-2 bg-black/40 rounded-full" />
                  </div>
                </div>
              </div>

              {/* 낙하 가이드 점선 (z-[15]) */}
              {isClickable && !isGameOver && (
                <div 
                  className="absolute top-[40px] bottom-[5px] border-l-2 border-dashed border-gray-400/60 pointer-events-none z-[15]"
                  style={{ left: `${cloudX}px` }}
                />
              )}

              {/* 2. 물리 엔진 캔버스 (z-20: 구름 앞, 들고 있는 과일 뒤) */}
              <div ref={sceneRef} className="absolute inset-0 pointer-events-none z-20" />

              {/* 3. 들고 있는 과일 (z-30: 가장 앞) */}
              <div className="absolute pointer-events-none z-30" style={{ left: `${cloudX}px`, top: '32px', transform: 'translateX(-50%) translateY(-50%)' }}>
                {isClickable && !isGameOver && (
                  <img 
                    src={`${import.meta.env.BASE_URL}fruits/${FRUIT_TYPES[currentFruitIndex].imageFile}`}
                    className="drop-shadow-md"
                    style={{ 
                      width: FRUIT_TYPES[currentFruitIndex].radius * 1.95,
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                    alt="fruit"
                  />
                )}
              </div>
              
              <div className="absolute top-[110px] left-[30px] right-[30px] h-0.5 border-t-2 border-dashed border-red-400 opacity-50 pointer-events-none z-40" />
            </div>
        </div>
        </div>
        <div className="flex flex-row lg:flex-col gap-4 lg:gap-6 mt-0 lg:mt-12 w-full max-w-[500px] justify-center lg:justify-start">
          <div className="w-32 h-44 p-4 bg-white/80 rounded-3xl shadow-xl border-4 border-[#FFD700] flex flex-col items-center justify-between shrink-0">
            <div className="text-[#B38B00] font-bold text-sm">NEXT</div>
            <div className="flex-1 flex items-center justify-center pt-2">
              <img src={`${import.meta.env.BASE_URL}fruits/${FRUIT_TYPES[nextFruitIndex].imageFile}`} className="drop-shadow-lg transition-all duration-300"
                style={{ width: FRUIT_TYPES[nextFruitIndex].radius * 1.95 * scale, height: 'auto', objectFit: 'contain' }} alt="next" />
            </div>
            <div className="text-xs font-bold text-gray-500">{FRUIT_TYPES[nextFruitIndex].name}</div>
          </div>
          <div className="w-40 h-44 p-3 bg-white/80 rounded-3xl shadow-xl border-4 border-[#87CEEB] flex flex-col items-center shrink-0">
            <div className="text-[#4682B4] font-bold mb-3 text-sm">진화의 고리</div>
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* 고리 중앙에 배치된 음소거 버튼 */}
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMuted(prev => !prev); }}
                className="z-20 w-12 h-12 bg-white/90 rounded-full shadow-md border-2 border-[#b2ebf2] hover:bg-[#e0f7fa] transition-all flex items-center justify-center text-xl cursor-pointer"
                title="음소거 토글"
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              {FRUIT_TYPES.map((fruit, i) => {
                const angle = (i / FRUIT_TYPES.length) * Math.PI * 2 - Math.PI / 2;
                return <img key={i} src={`${import.meta.env.BASE_URL}fruits/${fruit.imageFile}`} className="absolute drop-shadow"
                    style={{ width: (15 + i * 2.0) * scale, height: 'auto', transform: `translate(${Math.cos(angle) * 52 * scale}px, ${Math.sin(angle) * 52 * scale}px)` }} alt={fruit.name} />;
              })}
            </div>
          </div>
        </div>
      </div>
      {isGameOver && (
        <div className="absolute inset-0 bg-transparent z-50 flex items-center justify-center px-4 pointer-events-none">
          <div className="bg-transparent p-10 rounded-[3rem] text-center max-w-sm w-full animate-in fade-in zoom-in duration-300 pointer-events-auto">
            <h2 className="text-5xl lg:text-6xl font-black text-white drop-shadow-[0_4px_6px_rgba(0,0,0,1)] mb-4 uppercase">GAME OVER!</h2>
            <p className="text-2xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] mb-8">최종 점수: {score}</p>
            <button onClick={() => window.location.reload()} className="px-10 py-4 bg-orange-500/30 hover:bg-orange-600/50 text-white text-2xl font-black rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 border-4 border-white drop-shadow-md">다시 도전하기</button>
          </div>
        </div>
      )}

      {!isGameStarted && (
        <div className="absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center backdrop-blur-sm px-4">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-8 border-[#FFB833] text-center max-w-sm w-full">
            <h1 className="text-5xl font-black text-[#FF8533] mb-4">SUIKA GAME</h1>
            <p className="text-lg text-gray-600 mb-8 font-bold">과일을 모아 수박을 만드세요! 🍉</p>
            <button 
              onClick={() => {
                setIsGameStarted(true);
                playBgm();
              }}
              className="px-10 py-4 bg-[#FF8080] hover:bg-[#FF4D4D] text-white text-2xl font-black rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              게임 시작하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuikaGame;
