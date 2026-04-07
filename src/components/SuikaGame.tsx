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
  { id: 1, name: '체리', radius: 15, color: '#FF3333', borderColor: '#CC0000', imageFile: '1_cherry.png?v=2', imgW: 513, imgH: 684 },
  { id: 2, name: '딸기', radius: 22, color: '#FF5E7E', borderColor: '#D94361', isCustomShape: true, imageFile: '2_strawberry.png?v=2', imgW: 504, imgH: 618 },
  { id: 3, name: '포도', radius: 32, color: '#A066FF', borderColor: '#7A49D1', isCustomShape: true, imageFile: '3_grape.png?v=2', imgW: 570, imgH: 794 },
  { id: 4, name: '귤', radius: 38, color: '#FFCC00', borderColor: '#E6B800', imageFile: '4_tangerine_v3.png', imgW: 638, imgH: 720 },
  { id: 5, name: '감', radius: 48, color: '#FF8533', borderColor: '#D9651A', imageFile: '5_persimmon.png?v=2', imgW: 658, imgH: 659 },
  { id: 6, name: '사과', radius: 58, color: '#FF4D4D', borderColor: '#CC3333', imageFile: '6_apple.png?v=2', imgW: 560, imgH: 628 },
  { id: 7, name: '배', radius: 68, color: '#FFE162', borderColor: '#D9BC41', isCustomShape: true, imageFile: '7_pear.png?v=2', imgW: 620, imgH: 769 },
  { id: 8, name: '복숭아', radius: 82, color: '#FFADAD', borderColor: '#D98A8A', imageFile: '8_peach.png?v=2', imgW: 530, imgH: 594 },
  { id: 9, name: '파인애플', radius: 98, color: '#FFEC33', borderColor: '#D9C81A', isCustomShape: true, imageFile: '9_pineapple.png?v=2', imgW: 456, imgH: 718 },
  { id: 10, name: '멜론', radius: 118, color: '#B2FF66', borderColor: '#8ACC4D', imageFile: '10_melon.png?v=2', imgW: 592, imgH: 690 },
  { id: 11, name: '수박', radius: 140, color: '#2DB400', borderColor: '#248F00', imageFile: '11_watermelon.png?v=2', imgW: 586, imgH: 681 },
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
  const bgmRef = useRef<HTMLAudioElement>(null);
  const [bgmStarted, setBgmStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.muted = isMuted;
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

  const DEADLINE_Y = 110;

  useEffect(() => {
    if (!sceneRef.current) return;

    const engine = Matter.Engine.create();
    engineRef.current = engine;
    engine.gravity.y = 1.2;

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

    const glassOptions = {
      isStatic: true,
      friction: 0.1,
      restitution: 0.2,
      render: { fillStyle: '#FFFFFF55', strokeStyle: '#B2EBF2', lineWidth: 4 }
    };

    const containerWidth = 380;
    const containerHeight = 550;
    const centerX = 250;
    const centerY = 370;

    // 📦 투명 직사각형 상자 물리 구조 구축 (원작 고증)
    const wallThickness = 40;
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

    // Web Audio API를 이용한 합치기(Merge) 효과음 생성 함수
    const playMergeSound = (typeIndex: number) => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        // AudioContext를 한 번만 생성하여 재사용 (브라우저 제한 방지)
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        
        const audioCtx = audioCtxRef.current;
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

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

    // 병합 로직
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.label.startsWith('fruit_')) (bodyA as any).isNew = false;
        if (bodyB.label.startsWith('fruit_')) (bodyB as any).isNew = false;

        if (bodyA.label === bodyB.label && bodyA.label.startsWith('fruit_')) {
          const typeIndex = parseInt(bodyA.label.split('_')[1]);
          const points = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];
          setScore(prev => prev + points[typeIndex]);
          
          if (!isMuted) {
            playMergeSound(typeIndex);
          }
          
          Matter.Composite.remove(engine.world, [bodyA, bodyB]);
          if (typeIndex < 11) {
            createFruit((bodyA.position.x + bodyB.position.x) / 2, (bodyA.position.y + bodyB.position.y) / 2, typeIndex, engine.world, true);
          }
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
  }, [isGameOver]);

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
      // scale을 나누어주어 축소된 화면에서도 마우스 위치가 정확하게 맵핑되도록 조정
      setCloudX(Math.max(100, Math.min(400, (clientX - rect.left) / scale)));
    }
  };

  const handleClick = () => {
    if (!bgmStarted && bgmRef.current) {
      bgmRef.current.volume = 0.5;
      bgmRef.current.play().catch(e => console.log('Audio play failed:', e));
      setBgmStarted(true);
    }
    
    if (!isClickable || isGameOver || !engineRef.current) return;
    setIsClickable(false);
    createFruit(cloudX, 10, currentFruitIndex, engineRef.current.world);
    setTimeout(() => {
      setCurrentFruitIndex(nextFruitIndex);
      setNextFruitIndex(Math.floor(Math.random() * 5));
      setIsClickable(true);
    }, 800);
  };

  return (
    <div className="relative flex flex-col items-center justify-start min-h-screen bg-[#FFF9E6] font-sans overflow-hidden pt-0">
      <audio ref={bgmRef} src={`${import.meta.env.BASE_URL}bgm.mp3`} loop />
      
      {/* 음소거 토글 버튼 (전체 화면 고정) */}
      <button 
        onClick={(e) => { e.stopPropagation(); setIsMuted(prev => !prev); }}
        className="fixed top-6 right-6 z-50 p-4 text-3xl bg-white/90 backdrop-blur-sm rounded-full shadow-lg border-2 border-[#b2ebf2] hover:bg-white hover:scale-110 transition-all cursor-pointer flex items-center justify-center"
        title="음소거 토글"
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      <div className="relative flex flex-col lg:flex-row gap-4 lg:gap-8 items-center lg:items-start z-10 p-0 transform -translate-y-2">
        <div style={{ width: 500 * scale, height: 650 * scale }} className="relative shrink-0">
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 500, height: 650 }} className="absolute top-0 left-0 bg-white/10 rounded-b-[40px]">
            <div className="absolute top-4 left-4 px-4 py-1 bg-[#FF8080] text-white rounded-full shadow-lg border-2 border-white font-bold text-lg z-30 whitespace-nowrap">
              SCORE: {score}
            </div>
            <div ref={sceneRef} onMouseMove={handleMove} onTouchMove={handleMove} onTouchStart={handleMove} onTouchEnd={handleClick} onClick={handleClick} style={{ touchAction: 'none' }} className="relative w-[500px] h-[650px] cursor-none">
            <div className="absolute top-0 pointer-events-none" style={{ left: `${cloudX}px`, transform: 'translateX(-50%)' }}>
              {/* 구름 그림준이에 과일을 중앙에 표시 */}
              <div className="relative flex items-center justify-center w-24 h-12 bg-white rounded-full shadow-md">
                <div className="absolute -bottom-1 w-16 h-8 bg-white rounded-full" />
                {isClickable && !isGameOver && (
                  <img 
                    src={`${import.meta.env.BASE_URL}fruits/${FRUIT_TYPES[currentFruitIndex].imageFile}`}
                    className="relative z-10 drop-shadow-md"
                    style={{ 
                      width: Math.min(FRUIT_TYPES[currentFruitIndex].radius * 1.95, 48),
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                    alt="fruit"
                  />
                )}
                <div className="absolute flex gap-2" style={{ bottom: '6px' }}>
                  <div className="w-1.5 h-1.5 bg-black/40 rounded-full" />
                  <div className="w-1.5 h-1.5 bg-black/40 rounded-full" />
                </div>
              </div>
            </div>
            <div className="absolute top-[110px] left-[70px] right-[70px] h-0.5 border-t-2 border-dashed border-red-400 opacity-50 pointer-events-none" />
          </div>
        </div>
        </div>
        <div className="flex flex-row lg:flex-col gap-4 lg:gap-6 mt-0 lg:mt-12 w-full max-w-[500px] justify-center lg:justify-start">
          <div className="w-32 h-44 p-4 bg-white/80 rounded-3xl shadow-xl border-4 border-[#FFD700] flex flex-col items-center justify-between shrink-0">
            <div className="text-[#B38B00] font-bold text-sm">NEXT</div>
            <div className="flex-1 flex items-center justify-center pt-2">
              <img src={`${import.meta.env.BASE_URL}fruits/${FRUIT_TYPES[nextFruitIndex].imageFile}`} className="drop-shadow-lg transition-all duration-300 transform scale-125"
                style={{ width: Math.max(30, FRUIT_TYPES[nextFruitIndex].radius * 1.8), height: 'auto', objectFit: 'contain' }} alt="next" />
            </div>
            <div className="text-xs font-bold text-gray-500">{FRUIT_TYPES[nextFruitIndex].name}</div>
          </div>
          <div className="w-48 p-4 bg-white/80 rounded-3xl shadow-xl border-4 border-[#87CEEB] flex flex-col items-center">
            <div className="text-[#4682B4] font-bold mb-4">진화의 고리</div>
            <div className="relative w-36 h-36 flex items-center justify-center">
              {FRUIT_TYPES.map((fruit, i) => {
                const angle = (i / FRUIT_TYPES.length) * Math.PI * 2 - Math.PI / 2;
                return <img key={i} src={`${import.meta.env.BASE_URL}fruits/${fruit.imageFile}`} className="absolute drop-shadow"
                    style={{ width: 14 + i * 2, height: 'auto', transform: `translate(${Math.cos(angle) * 55}px, ${Math.sin(angle) * 55}px)` }} alt={fruit.name} />;
              })}
            </div>
          </div>
        </div>
      </div>
      {isGameOver && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-8 border-orange-400 text-center max-w-sm w-full">
            <h2 className="text-5xl lg:text-6xl font-black text-orange-600 mb-4">GAME OVER!</h2>
            <p className="text-2xl font-bold text-gray-700 mb-8">최종 점수: {score}</p>
            <button onClick={() => window.location.reload()} className="px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white text-2xl font-black rounded-full shadow-lg transition-transform hover:scale-110">다시 도전하기</button>
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
                if (bgmRef.current) {
                  bgmRef.current.volume = 0.5;
                  bgmRef.current.play().catch(e => console.log('Audio play failed:', e));
                  setBgmStarted(true);
                }
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
