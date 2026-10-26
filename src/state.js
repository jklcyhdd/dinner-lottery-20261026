export const MAX_ROUND = 60;
export const STORAGE_KEY = "dinner-lottery-state-v1";

const emptyState = () => ({
  version: 1,
  round: 1,
  eatenIds: [],
  pendingId: null,
  history: [],
  lastRound: null,
});

const uniqueStrings = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string")
    ? [...new Set(value)]
    : null;

const validHistory = (value) =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.eatenAt === "string" &&
      Number.isInteger(item.round),
  );

export function createState(storageValue) {
  if (storageValue == null || storageValue === "") {
    return { state: emptyState(), warning: null };
  }

  try {
    const parsed = JSON.parse(storageValue);
    const eatenIds = uniqueStrings(parsed?.eatenIds);
    const pendingId =
      parsed?.pendingId == null || typeof parsed.pendingId === "string"
        ? parsed.pendingId
        : undefined;
    if (
      parsed?.version !== 1 ||
      !Number.isInteger(parsed.round) ||
      parsed.round < 1 ||
      eatenIds == null ||
      pendingId === undefined ||
      (pendingId && eatenIds.includes(pendingId)) ||
      !validHistory(parsed.history)
    ) {
      throw new Error("Invalid state");
    }
    return {
      state: {
        version: 1,
        round: parsed.round,
        eatenIds,
        pendingId,
        history: parsed.history,
        lastRound:
          parsed.lastRound && typeof parsed.lastRound === "object"
            ? parsed.lastRound
            : null,
      },
      warning: null,
    };
  } catch {
    return { state: emptyState(), warning: "STORAGE_RECOVERED" };
  }
}

export function availableRecipes(state, recipes) {
  const eaten = new Set(state.eatenIds);
  return recipes.filter((recipe) => !eaten.has(recipe.id));
}

export function latestConfirmedId(state) {
  const latest = state.history.at(-1);
  return latest?.round === state.round ? latest.id : null;
}

export function drawDish(state, recipes, random = Math.random) {
  const candidates = availableRecipes(state, recipes).filter(
    (recipe) => recipe.id !== state.pendingId,
  );
  if (candidates.length === 0) {
    return state;
  }
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return { ...state, pendingId: candidates[index].id };
}

export function confirmDish(state, id, now = new Date()) {
  if (!id || state.pendingId !== id || state.eatenIds.includes(id)) {
    return state;
  }
  const eatenIds = [...state.eatenIds, id];
  const historyEntry = {
    id,
    eatenAt: now.toISOString(),
    round: state.round,
  };
  if (eatenIds.length >= MAX_ROUND) {
    return {
      ...state,
      round: state.round + 1,
      eatenIds: [],
      pendingId: null,
      history: [...state.history, historyEntry],
      lastRound: {
        round: state.round,
        dishCount: eatenIds.length,
        completedAt: historyEntry.eatenAt,
      },
    };
  }
  return {
    ...state,
    pendingId: null,
    eatenIds,
    history: [...state.history, historyEntry],
  };
}

export function serializeState(state) {
  return JSON.stringify(state);
}

export function sanitizeState(state, recipes) {
  const validIds = new Set(recipes.map((recipe) => recipe.id));
  const eatenIds = state.eatenIds.filter((id) => validIds.has(id));
  const pendingId = validIds.has(state.pendingId) ? state.pendingId : null;
  const history = state.history.filter((item) => validIds.has(item.id));
  return {
    ...state,
    eatenIds,
    pendingId,
    history,
  };
}
