'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RotateCcw } from 'lucide-react';
import { useApp } from '@/context/AppProviders';
import { useAuth } from '@/context/AuthProvider';
import { BOARD_SIZE, initializeBoard } from '@/lib/checkers/board';
import type {
  AiLevel,
  Board,
  GameMode,
  Move,
  Piece,
  PieceColor,
  Position,
  SavedGameState,
  TimeControl,
} from '@/lib/checkers/types';
import { useGameClock } from '@/hooks/useGameClock';
import GameClockDisplay from '@/components/GameClockDisplay';
import { saveFinishedGame } from '@/lib/games';
import {
  playCaptureSound,
  playMoveSound,
  playSelectSound,
  playWinSound,
} from '@/lib/sounds';
const CELL_PERCENT = 100 / BOARD_SIZE;

interface CapturedPieceAnim {
  pos: Position;
  piece: Piece;
}

interface MoveAnimation {
  move: Move;
  piece: Piece;
  flying: boolean;
}

function PieceDisk({ piece }: { piece: Piece }) {
  return (
    <div
      className={`
        flex aspect-square w-[72%] max-h-[72%] shrink-0 items-center justify-center rounded-full
        shadow-lg
        ${piece.color === 'white'
          ? 'bg-gradient-to-br from-gray-100 to-gray-300 border-2 border-gray-400'
          : 'bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-950'
        }
      `}
    >
      {piece.type === 'king' && (
        <Trophy
          className={`max-h-[62%] max-w-[62%] shrink-0 ${
            piece.color === 'white' ? 'text-yellow-600' : 'text-yellow-400'
          }`}
        />
      )}
    </div>
  );
}

export interface OnlinePlayConfig {
  myColor: PieceColor;
  syncVersion: number;
  synced: {
    board: Board;
    currentPlayer: PieceColor;
    moveHistory: Move[];
    winner: PieceColor | null;
  };
  onMove: (move: Move) => Promise<boolean>;
  disabled?: boolean;
}

interface CheckersBoardProps {
  gameMode: GameMode;
  aiLevel: AiLevel;
  humanColor?: PieceColor;
  timeControl?: TimeControl;
  restoredState?: SavedGameState | null;
  onPersist?: (state: SavedGameState) => void;
  onGameEnd?: () => void;
  onlinePlay?: OnlinePlayConfig;
}

export default function CheckersBoard({
  gameMode,
  aiLevel,
  humanColor = 'white',
  timeControl = 'standard',
  restoredState,
  onPersist,
  onGameEnd,
  onlinePlay,
}: CheckersBoardProps) {
  const myColor = onlinePlay?.myColor ?? humanColor;
  const aiColor: PieceColor = humanColor === 'white' ? 'black' : 'white';
  const { soundEnabled } = useApp();
  const { user, refreshProfile } = useAuth();
  const gameSavedRef = useRef(!!restoredState?.winner);

  const [board, setBoard] = useState<Board>(
    () => restoredState?.board ?? initializeBoard()
  );
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>(
    () => restoredState?.currentPlayer ?? 'white'
  );
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [winner, setWinner] = useState<PieceColor | null>(
    () => restoredState?.winner ?? null
  );
  const [mustCapture, setMustCapture] = useState(false);
  const [moveHistory, setMoveHistory] = useState<Move[]>(
    () => restoredState?.moveHistory ?? []
  );
  const [moveAnimation, setMoveAnimation] = useState<MoveAnimation | null>(null);
  const [capturingPieces, setCapturingPieces] = useState<CapturedPieceAnim[]>([]);
  const [captureFading, setCaptureFading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [winByTimeout, setWinByTimeout] = useState(false);
  const isAnimatingRef = useRef(false);
  const moveFinishedRef = useRef(false);
  const animatingMoveRef = useRef<{ move: Move; isIncoming: boolean } | null>(null);

  const localMovesLengthRef = useRef(moveHistory.length);
  useEffect(() => {
    localMovesLengthRef.current = moveHistory.length;
  }, [moveHistory.length]);

  const handleClockTimeout = useCallback((timeoutWinner: PieceColor) => {
    setWinByTimeout(true);
    setWinner(timeoutWinner);
  }, []);

  const {
    blitz,
    tick: clockTick,
    whiteDisplayMs,
    blackDisplayMs,
    matchElapsedMs,
    onTurnEnd,
    getPersisted,
    resetClock,
    isLowTime,
  } = useGameClock({
    timeControl: gameMode === 'online' ? 'standard' : timeControl,
    currentPlayer,
    winner,
    paused: isAnimating,
    restored: restoredState?.clock ?? null,
    onTimeout: handleClockTimeout,
  });

  useEffect(() => {
    if (!onlinePlay || isAnimatingRef.current) return;

    const syncedMoves = onlinePlay.synced.moveHistory;
    // Берем актуальную длину ходов из Ref, чтобы избежать stale closures
    const localMovesLength = localMovesLengthRef.current;
    const diff = syncedMoves.length - localMovesLength;

    if (diff === 1) {
      // Пришел один новый ход от соперника — запускаем анимацию
      const incomingMove = syncedMoves[localMovesLength];
      playMove(incomingMove, true);
    } else if (diff >= 0 && diff !== 1) {
      // Обычная синхронизация нашего хода или переподключение (diff === 0 или diff > 1)
      setBoard(onlinePlay.synced.board);
      setCurrentPlayer(onlinePlay.synced.currentPlayer);
      setMoveHistory(onlinePlay.synced.moveHistory);
      setWinner(onlinePlay.synced.winner);
      setSelectedPiece(null);
      setValidMoves([]);
      setMustCapture(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlinePlay?.syncVersion]);

  useEffect(() => {
    if (!onPersist || gameMode === 'online') return;
    onPersist({
      board,
      currentPlayer,
      moveHistory,
      winner,
      gameMode,
      aiLevel,
      humanColor: gameMode === 'ai' ? humanColor : undefined,
      timeControl: blitz ? 'blitz' : 'standard',
      clock: blitz ? getPersisted() : undefined,
      savedAt: new Date().toISOString(),
    });
  }, [
    board,
    currentPlayer,
    moveHistory,
    winner,
    gameMode,
    aiLevel,
    humanColor,
    blitz,
    clockTick,
    getPersisted,
    onPersist,
  ]);

  useEffect(() => {
    if (!winner || gameSavedRef.current || gameMode === 'online') return;
    gameSavedRef.current = true;
    if (soundEnabled) playWinSound();

    void (async () => {
      const recorded = await saveFinishedGame({
        userId: user?.id,
        gameMode,
        aiLevel,
        winner,
        moves: moveHistory,
        humanColor: gameMode === 'ai' ? humanColor : undefined,
      });
      if (recorded) {
        await refreshProfile();
        onGameEnd?.();
      }
    })();
  }, [
    winner,
    user?.id,
    gameMode,
    aiLevel,
    humanColor,
    moveHistory,
    soundEnabled,
    refreshProfile,
    onGameEnd,
  ]);

  const cellStyle = (row: number, col: number) => ({
    left: `${col * CELL_PERCENT}%`,
    top: `${row * CELL_PERCENT}%`,
  });

  // Проверка валидности хода
  const isValidPosition = (row: number, col: number): boolean => {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  };

  // Играют только на тёмных клетках (как при расстановке)
  const isPlayableSquare = (row: number, col: number): boolean => {
    return isValidPosition(row, col) && (row + col) % 2 === 1;
  };

  const getMoveDirections = (piece: Piece): [number, number][] => {
    if (piece.type === 'king') {
      return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    }
    return piece.color === 'white'
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];
  };

  // В серии взятий простая шашка бьёт во все диагонали
  const getCaptureDirections = (piece: Piece, inCaptureChain: boolean): [number, number][] => {
    if (piece.type === 'king' || inCaptureChain) {
      return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    }
    return getMoveDirections(piece);
  };

  // Получение возможных ходов для шашки
  const getPossibleMoves = (row: number, col: number, board: Board): Move[] => {
    const piece = board[row][col];
    if (!piece) return [];

    const moves: Move[] = [];
    const directions = getMoveDirections(piece);

    // Обычные ходы
    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow;
      const newCol = col + dCol;

      if (isPlayableSquare(newRow, newCol) && !board[newRow][newCol]) {
        moves.push({
          from: { row, col },
          to: { row: newRow, col: newCol },
        });
      }
    }

    // Взятия
    const captures = getCaptureMoves(row, col, board);
    moves.push(...captures);

    return moves;
  };

  // Получение ходов со взятием
  const getCaptureMoves = (
    row: number,
    col: number,
    board: Board,
    capturedPieces: Position[] = [],
    origin?: Position
  ): Move[] => {
    const piece = board[row][col];
    if (!piece) return [];

    const start = origin ?? { row, col };
    const captures: Move[] = [];
    const directions = getCaptureDirections(piece, capturedPieces.length > 0);

    for (const [dRow, dCol] of directions) {
      const jumpRow = row + dRow;
      const jumpCol = col + dCol;
      const landRow = row + 2 * dRow;
      const landCol = col + 2 * dCol;

      if (
        isValidPosition(jumpRow, jumpCol) &&
        isPlayableSquare(landRow, landCol) &&
        board[jumpRow]?.[jumpCol] &&
        board[jumpRow][jumpCol]!.color !== piece.color &&
        !board[landRow][landCol] &&
        !capturedPieces.some(p => p.row === jumpRow && p.col === jumpCol)
      ) {
        const newCaptured = [...capturedPieces, { row: jumpRow, col: jumpCol }];

        // Создаем временную доску для продолжения взятия
        const tempBoard = board.map(r => [...r]);
        tempBoard[landRow][landCol] = piece;
        tempBoard[row][col] = null;
        tempBoard[jumpRow][jumpCol] = null;

        // Проверяем возможность продолжения взятия
        const continuedCaptures = getCaptureMoves(
          landRow,
          landCol,
          tempBoard,
          newCaptured,
          start
        );

        if (continuedCaptures.length > 0) {
          captures.push(...continuedCaptures);
        } else {
          captures.push({
            from: start,
            to: { row: landRow, col: landCol },
            captures: newCaptured,
          });
        }
      }
    }

    return captures;
  };

  // Получение всех возможных ходов для игрока
  const getAllPlayerMoves = (player: PieceColor, board: Board): Move[] => {
    const allMoves: Move[] = [];
    const captureMoves: Move[] = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece && piece.color === player) {
          const moves = getPossibleMoves(row, col, board);
          const captures = moves.filter(m => m.captures && m.captures.length > 0);
          
          if (captures.length > 0) {
            captureMoves.push(...captures);
          } else {
            allMoves.push(...moves);
          }
        }
      }
    }

    // Если есть взятия, они обязательны
    return captureMoves.length > 0 ? captureMoves : allMoves;
  };

  const applyMoveToBoard = (prev: Board, move: Move): Board => {
    const newBoard = prev.map(row => [...row]);
    const piece = newBoard[move.from.row][move.from.col];
    if (!piece) return prev;

    newBoard[move.to.row][move.to.col] = piece;
    newBoard[move.from.row][move.from.col] = null;

    if (move.captures) {
      move.captures.forEach(pos => {
        newBoard[pos.row][pos.col] = null;
      });
    }

    if (
      piece.type === 'regular' &&
      ((piece.color === 'white' && move.to.row === 0) ||
        (piece.color === 'black' && move.to.row === BOARD_SIZE - 1))
    ) {
      newBoard[move.to.row][move.to.col] = { ...piece, type: 'king' };
    }

    return newBoard;
  };

  const commitMove = useCallback(
    (move: Move, isIncoming: boolean = false) => {
      if (blitz && !winner) {
        onTurnEnd(currentPlayer);
      }

      // Безопасно вычисляем новые данные
      const newBoard = applyMoveToBoard(board, move);
      const opponent = currentPlayer === 'white' ? 'black' : 'white';
      const opponentMoves = getAllPlayerMoves(opponent, newBoard);

      // Обновляем все стейты на одном уровне
      setBoard(newBoard);
      setMoveHistory(h => [...h, move]);
      
      if (opponentMoves.length === 0) {
        setWinner(currentPlayer);
      } else {
        setCurrentPlayer(opponent);
      }

      // Отправляем ход на сервер, только если это мы сделали ход
      if (onlinePlay && !isIncoming) {
        void onlinePlay.onMove(move);
      }
    },
    [board, currentPlayer, onlinePlay, blitz, winner, onTurnEnd]
  );

  const finishMoveAnimation = useCallback(() => {
    const animData = animatingMoveRef.current;
    if (!animData || moveFinishedRef.current) return;
    moveFinishedRef.current = true;
    animatingMoveRef.current = null;

    commitMove(animData.move, animData.isIncoming);

    setMoveAnimation(null);
    setCapturingPieces([]);
    setCaptureFading(false);
    isAnimatingRef.current = false;
    setIsAnimating(false);
  }, [commitMove]);

  const playMove = useCallback(
    (move: Move, isIncoming: boolean = false) => {
      if (isAnimatingRef.current) return;

      const piece = board[move.from.row][move.from.col];
      if (!piece) return;

      if (soundEnabled) {
        if (move.captures?.length) playCaptureSound();
        else playMoveSound();
      }

      isAnimatingRef.current = true;
      moveFinishedRef.current = false;
      setIsAnimating(true);
      setSelectedPiece(null);
      setValidMoves([]);
      setMustCapture(false);

      const caps: CapturedPieceAnim[] =
        move.captures
          ?.map(pos => {
            const captured = board[pos.row][pos.col];
            return captured ? { pos, piece: captured } : null;
          })
          .filter((c): c is CapturedPieceAnim => c !== null) ?? [];

      setCapturingPieces(caps);
      setCaptureFading(false);
      
      // Сохраняем и сам ход, и откуда он пришел
      animatingMoveRef.current = { move, isIncoming };
      setMoveAnimation({ move, piece, flying: false });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMoveAnimation(prev => (prev ? { ...prev, flying: true } : null));
          if (caps.length > 0) setCaptureFading(true);
        });
      });

      window.setTimeout(() => {
        if (!moveFinishedRef.current && isAnimatingRef.current) {
          finishMoveAnimation();
        }
      }, 450);
    },
    [board, finishMoveAnimation, soundEnabled]
  );

  // Обработка клика по клетке
  const handleCellClick = (row: number, col: number) => {
    if (winner || isAnimatingRef.current) return;
    if (onlinePlay?.disabled) return;
    if (gameMode === 'online' && currentPlayer !== myColor) return;
    if (gameMode === 'ai' && currentPlayer !== humanColor) return;

    const piece = board[row][col];

    // Выбор шашки
    if (piece && piece.color === currentPlayer) {
      const moves = getPossibleMoves(row, col, board);
      const allMoves = getAllPlayerMoves(currentPlayer, board);
      const hasCaptures = allMoves.some(m => m.captures && m.captures.length > 0);

      // Фильтруем ходы: только взятия, если они есть; только с этой клетки и на игровые поля
      const filteredMoves = (hasCaptures
        ? moves.filter(m => m.captures && m.captures.length > 0)
        : moves
      ).filter(
        m =>
          m.from.row === row &&
          m.from.col === col &&
          isPlayableSquare(m.to.row, m.to.col)
      );

      if (soundEnabled) playSelectSound();
      setSelectedPiece({ row, col });
      setValidMoves(filteredMoves);
      setMustCapture(hasCaptures);
      return;
    }

    // Выполнение хода
    if (selectedPiece) {
      const move = validMoves.find(
        m =>
          m.from.row === selectedPiece.row &&
          m.from.col === selectedPiece.col &&
          m.to.row === row &&
          m.to.col === col
      );

      if (move) {
        playMove(move);
      }
    }
  };

  // ИИ ход
  useEffect(() => {
    if (
      gameMode === 'ai' &&
      currentPlayer === aiColor &&
      !winner &&
      !isAnimating
    ) {
      const aiMoves = getAllPlayerMoves(aiColor, board);

      if (aiMoves.length === 0) {
        setWinner(humanColor);
        return;
      }

      const timer = setTimeout(() => {
        if (isAnimatingRef.current) return;

        let selectedMove: Move;

        if (aiLevel === 'easy') {
          selectedMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];
        } else {
          const captureMoves = aiMoves.filter(m => m.captures && m.captures.length > 0);
          const movesToConsider = captureMoves.length > 0 ? captureMoves : aiMoves;

          selectedMove = movesToConsider.reduce((best, move) => {
            const score = evaluateMove(move, board, aiColor);
            const bestScore = evaluateMove(best, board, aiColor);
            return score > bestScore ? move : best;
          });
        }

        playMove(selectedMove);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [
    currentPlayer,
    gameMode,
    winner,
    isAnimating,
    board,
    aiLevel,
    aiColor,
    humanColor,
    playMove,
  ]);

  // Простая оценка хода для ИИ
  const evaluateMove = (move: Move, board: Board, forColor: PieceColor): number => {
    let score = 0;

    // Взятия
    if (move.captures) {
      score += move.captures.length * 100;
    }

    // Продвижение к дамке
    const piece = board[move.from.row][move.from.col];
    if (piece && piece.type === 'regular') {
      score +=
        forColor === 'white'
          ? (BOARD_SIZE - 1 - move.to.row) * 2
          : move.to.row * 2;
    }

    // Центральные позиции
    const centerDistance = Math.abs(move.to.col - BOARD_SIZE / 2);
    score += (BOARD_SIZE - centerDistance) * 3;

    return score;
  };

  // Сброс игры
  const resetGame = () => {
    gameSavedRef.current = false;
    setWinByTimeout(false);
    resetClock();
    setBoard(initializeBoard());
    setCurrentPlayer('white');
    setSelectedPiece(null);
    setValidMoves([]);
    setWinner(null);
    setMoveHistory([]);
    setMoveAnimation(null);
    setCapturingPieces([]);
    setCaptureFading(false);
    animatingMoveRef.current = null;
    isAnimatingRef.current = false;
    setIsAnimating(false);
  };

  const isCellHiddenByAnimation = (row: number, col: number) => {
    if (!moveAnimation) return false;
    const { move } = moveAnimation;
    if (move.from.row === row && move.from.col === col) return true;
    if (move.to.row === row && move.to.col === col) return true;
    return move.captures?.some(p => p.row === row && p.col === col) ?? false;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:items-stretch lg:gap-5">
      {/* Доска */}
      <div className="relative flex shrink-0 items-center justify-center lg:min-h-0 lg:min-w-0 lg:flex-1">
        <div className="checker-board-max shadow-2xl">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900 to-amber-700 p-2 sm:p-2.5">
            {mustCapture && selectedPiece && (
              <div className="mb-1.5 shrink-0 rounded-md bg-red-500 px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">
                Обязательное взятие!
              </div>
            )}
            <div className="relative min-h-0 flex-1">
              <div className="grid h-full min-h-0 grid-cols-8 grid-rows-8 gap-0 overflow-hidden rounded-lg border-[3px] border-amber-950 sm:border-4">
                {board.map((row, rowIndex) =>
                  row.map((_, colIndex) => {
                    const isBlackCell = (rowIndex + colIndex) % 2 === 1;
                    const isSelected =
                      selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;
                    const isValidMove = validMoves.some(
                      m => m.to.row === rowIndex && m.to.col === colIndex
                    );

                    return (
                      <div
                        key={`cell-${rowIndex}-${colIndex}`}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        className={`
                          h-full min-h-0 w-full min-w-0 cursor-pointer
                          transition-all duration-200
                          ${isBlackCell ? 'bg-amber-950' : 'bg-amber-100'}
                          ${isSelected ? 'ring-2 ring-yellow-400 ring-inset sm:ring-4' : ''}
                          ${isValidMove ? 'ring-2 ring-green-400 ring-inset animate-pulse sm:ring-4' : ''}
                          hover:brightness-110
                        `}
                      />
                    );
                  })
                )}
              </div>

              <div className="checker-pieces-layer absolute inset-0">
                {board.map((row, rowIndex) =>
                  row.map((piece, colIndex) => {
                    if (!piece || isCellHiddenByAnimation(rowIndex, colIndex)) return null;

                    return (
                      <div
                        key={`piece-${rowIndex}-${colIndex}`}
                        className="checker-piece-slot"
                        style={cellStyle(rowIndex, colIndex)}
                      >
                        <PieceDisk piece={piece} />
                      </div>
                    );
                  })
                )}

                {capturingPieces.map(({ pos, piece }) => (
                  <div
                    key={`capture-${pos.row}-${pos.col}`}
                    className={`checker-piece-slot checker-piece-capture ${
                      captureFading ? 'checker-piece-capture--fade' : ''
                    }`}
                    style={cellStyle(pos.row, pos.col)}
                  >
                    <PieceDisk piece={piece} />
                  </div>
                ))}

                {moveAnimation && (
                  <div
                    className="checker-piece-slot checker-piece-fly"
                    style={cellStyle(
                      moveAnimation.flying
                        ? moveAnimation.move.to.row
                        : moveAnimation.move.from.row,
                      moveAnimation.flying
                        ? moveAnimation.move.to.col
                        : moveAnimation.move.from.col
                    )}
                    onTransitionEnd={e => {
                      if (
                        moveAnimation.flying &&
                        (e.propertyName === 'left' || e.propertyName === 'top')
                      ) {
                        finishMoveAnimation();
                      }
                    }}
                  >
                    <PieceDisk piece={moveAnimation.piece} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Боковая панель */}
      <aside className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto overscroll-contain lg:flex-none lg:w-72 lg:min-w-[18rem] lg:justify-start lg:gap-3 xl:w-80">
        {gameMode !== 'online' && (
          <GameClockDisplay
            blitz={blitz}
            whiteMs={whiteDisplayMs}
            blackMs={blackDisplayMs}
            matchElapsedMs={matchElapsedMs}
            currentPlayer={currentPlayer}
            isLowTime={isLowTime}
          />
        )}

        {/* Статус игры */}
        <div className="rounded-xl border border-app-panel-border bg-app-panel p-3 backdrop-blur-sm sm:p-4 lg:p-5">
          <h3 className="mb-2 text-base font-bold text-app-text lg:mb-4 lg:text-xl">
            Статус игры
          </h3>

          {winner ? (
            <div className="space-y-3 text-center lg:space-y-4">
              <Trophy className="mx-auto h-12 w-12 text-yellow-400 lg:h-16 lg:w-16" />
              <p className="text-xl font-bold text-app-text lg:text-2xl">
                Победили {winner === 'white' ? 'Белые' : 'Черные'}!
              </p>
              {winByTimeout && (
                <p className="text-sm text-app-muted">
                  Победа по времени — у соперника закончились 3 минуты
                </p>
              )}
              <button
                onClick={resetGame}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-2.5 font-bold text-white transition-all hover:from-green-600 hover:to-emerald-600 lg:py-3"
              >
                <RotateCcw className="h-5 w-5" />
                Новая игра
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between lg:mb-4">
                <span className="text-sm text-app-muted lg:text-base">Ход:</span>
                <span
                  className={`text-base font-bold lg:text-lg ${
                    currentPlayer === 'white' ? 'text-app-text' : 'text-app-muted'
                  }`}
                >
                  {currentPlayer === 'white' ? 'Белые' : 'Черные'}
                </span>
              </div>

              {(gameMode === 'ai' || gameMode === 'online') && (
                <div className="mb-3 flex items-center justify-between text-sm lg:text-base">
                  <span className="text-app-muted">Вы играете:</span>
                  <span className="font-bold text-app-text">
                    {myColor === 'white' ? 'Белые' : 'Чёрные'}
                  </span>
                </div>
              )}
              {gameMode === 'ai' && (
                <div className="flex items-center justify-between text-sm lg:text-base">
                  <span className="text-app-muted">Сложность ИИ:</span>
                  <span className="font-bold text-green-400">
                    {aiLevel === 'easy'
                      ? 'Легко'
                      : aiLevel === 'medium'
                        ? 'Средне'
                        : 'Сложно'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Подсказка */}
        {!winner && validMoves.length > 0 && (
          <div className="rounded-xl border border-blue-400/30 bg-blue-500/20 p-3 backdrop-blur-sm lg:p-4">
            <p className="text-xs text-blue-200 lg:text-sm">
              💡 <strong>Подсказка:</strong> Зелёные клетки показывают возможные ходы
            </p>
          </div>
        )}

        {/* История ходов */}
        <div className="rounded-xl border border-app-panel-border bg-app-panel p-3 backdrop-blur-sm sm:p-4 lg:p-5">
          <h3 className="mb-2 text-base font-bold text-app-text lg:mb-4 lg:text-xl">
            История ({moveHistory.length} ходов)
          </h3>
          <div className="max-h-24 space-y-2 overflow-y-auto sm:max-h-28 lg:max-h-36">
            {moveHistory.slice(-5).reverse().map((move, index) => (
              <div key={index} className="rounded bg-app-panel-hover p-2 text-xs text-app-muted lg:text-sm">
                Ход #{moveHistory.length - index}: ({move.from.row},{move.from.col}) → ({move.to.row},{move.to.col})
                {move.captures && ` (взято: ${move.captures.length})`}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}