'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RotateCcw } from 'lucide-react';

type PieceType = 'regular' | 'king';
type PieceColor = 'black' | 'white';

interface Piece {
  color: PieceColor;
  type: PieceType;
}

interface Position {
  row: number;
  col: number;
}

interface Move {
  from: Position;
  to: Position;
  captures?: Position[];
}

type Board = (Piece | null)[][];

const BOARD_SIZE = 8;
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

// Инициализация доски
const initializeBoard = (): Board => {
  const board: Board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  // Черные шашки (верхние 3 ряда)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'black', type: 'regular' };
      }
    }
  }

  // Белые шашки (нижние 3 ряда)
  for (let row = 5; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'white', type: 'regular' };
      }
    }
  }

  return board;
};

interface CheckersBoardProps {
  gameMode: 'pvp' | 'ai';
  aiLevel: 'easy' | 'medium' | 'hard';
}

export default function CheckersBoard({ gameMode, aiLevel }: CheckersBoardProps) {
  const [board, setBoard] = useState<Board>(initializeBoard());
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('white');
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [mustCapture, setMustCapture] = useState(false);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [moveAnimation, setMoveAnimation] = useState<MoveAnimation | null>(null);
  const [capturingPieces, setCapturingPieces] = useState<CapturedPieceAnim[]>([]);
  const [captureFading, setCaptureFading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);
  const moveFinishedRef = useRef(false);
  const animatingMoveRef = useRef<Move | null>(null);

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

  // Применение хода к состоянию (после анимации)
  const commitMove = useCallback(
    (move: Move) => {
      setBoard(prev => {
        const newBoard = applyMoveToBoard(prev, move);
        const opponent = currentPlayer === 'white' ? 'black' : 'white';
        const opponentMoves = getAllPlayerMoves(opponent, newBoard);

        setMoveHistory(h => [...h, move]);
        if (opponentMoves.length === 0) {
          setWinner(currentPlayer);
        } else {
          setCurrentPlayer(opponent);
        }

        return newBoard;
      });
    },
    [currentPlayer]
  );

  const finishMoveAnimation = useCallback(() => {
    const move = animatingMoveRef.current;
    if (!move || moveFinishedRef.current) return;
    moveFinishedRef.current = true;
    animatingMoveRef.current = null;
    commitMove(move);
    setMoveAnimation(null);
    setCapturingPieces([]);
    setCaptureFading(false);
    isAnimatingRef.current = false;
    setIsAnimating(false);
  }, [commitMove]);

  const playMove = useCallback(
    (move: Move) => {
      if (isAnimatingRef.current) return;

      const piece = board[move.from.row][move.from.col];
      if (!piece) return;

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
      animatingMoveRef.current = move;
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
    [board, finishMoveAnimation]
  );

  // Обработка клика по клетке
  const handleCellClick = (row: number, col: number) => {
    if (winner || isAnimatingRef.current) return;
    if (gameMode === 'ai' && currentPlayer === 'black') return;

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
      currentPlayer === 'black' &&
      !winner &&
      !isAnimating
    ) {
      const aiMoves = getAllPlayerMoves('black', board);

      if (aiMoves.length === 0) {
        setWinner('white');
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
            const score = evaluateMove(move, board);
            const bestScore = evaluateMove(best, board);
            return score > bestScore ? move : best;
          });
        }

        playMove(selectedMove);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, winner, isAnimating, board, aiLevel, playMove]);

  // Простая оценка хода для ИИ
  const evaluateMove = (move: Move, board: Board): number => {
    let score = 0;

    // Взятия
    if (move.captures) {
      score += move.captures.length * 100;
    }

    // Продвижение к дамке
    const piece = board[move.from.row][move.from.col];
    if (piece && piece.type === 'regular') {
      score += (BOARD_SIZE - move.to.row) * 2;
    }

    // Центральные позиции
    const centerDistance = Math.abs(move.to.col - BOARD_SIZE / 2);
    score += (BOARD_SIZE - centerDistance) * 3;

    return score;
  };

  // Сброс игры
  const resetGame = () => {
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
        {/* Статус игры */}
        <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:p-4 lg:p-5">
          <h3 className="mb-2 text-base font-bold text-white lg:mb-4 lg:text-xl">
            Статус игры
          </h3>

          {winner ? (
            <div className="space-y-3 text-center lg:space-y-4">
              <Trophy className="mx-auto h-12 w-12 text-yellow-400 lg:h-16 lg:w-16" />
              <p className="text-xl font-bold text-white lg:text-2xl">
                Победили {winner === 'white' ? 'Белые' : 'Черные'}!
              </p>
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
                <span className="text-purple-200 text-sm lg:text-base">Ход:</span>
                <span
                  className={`text-base font-bold lg:text-lg ${
                    currentPlayer === 'white' ? 'text-gray-200' : 'text-gray-400'
                  }`}
                >
                  {currentPlayer === 'white' ? 'Белые' : 'Черные'}
                </span>
              </div>

              {gameMode === 'ai' && (
                <div className="flex items-center justify-between text-sm lg:text-base">
                  <span className="text-purple-200">Сложность ИИ:</span>
                  <span className="font-bold text-green-400">
                    {aiLevel === 'easy' ? 'Легко' : aiLevel === 'medium' ? 'Средне' : 'Сложно'}
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
        <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:p-4 lg:p-5">
          <h3 className="mb-2 text-base font-bold text-white lg:mb-4 lg:text-xl">
            История ({moveHistory.length} ходов)
          </h3>
          <div className="max-h-24 space-y-2 overflow-y-auto sm:max-h-28 lg:max-h-36">
            {moveHistory.slice(-5).reverse().map((move, index) => (
              <div key={index} className="rounded bg-white/5 p-2 text-xs text-purple-200 lg:text-sm">
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