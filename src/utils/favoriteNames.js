/** 与页面显示一致地去掉首尾空白，保留名称内部的空格及连续空格。 */
export function normalizeFavoriteName(name) {
  return typeof name === 'string' ? name.trim() : '';
}

/** Display names are not identities; report collisions after the usual normalization. */
export function duplicateFavoriteNames(names) {
  const seen = new Set(), duplicates = new Set();
  for (const value of names) {
    const name = normalizeFavoriteName(value);
    if (name && seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return duplicates;
}

/** Name-based copy cannot infer an intended ID, regardless of transport. */
export function assertUnambiguousFavoriteName(names, name) {
  if (duplicateFavoriteNames(names).has(normalizeFavoriteName(name)))
    throw new Error(`同名收藏夹 [${normalizeFavoriteName(name)}] 无法按名称确定复制对象，请先将相关收藏夹改为不同名称；不会按顺序选择或自动切换方式。`);
}

/** 在任何跳转或提交前检查整个任务列表；同时兼容旧版本保存的任务。 */
export function normalizeCopyTasks(tasks) {
  if (!Array.isArray(tasks)) throw new Error('复制任务必须是列表');
  const seen = new Set();
  return tasks.map(task => {
    if (!task || typeof task !== 'object' || Array.isArray(task)) throw new Error('复制任务格式无效');
    const source = normalizeFavoriteName(task.source);
    const target = normalizeFavoriteName(task.target);
    if (!source || !target) throw new Error('源收藏夹和目标收藏夹名称不能为空或仅包含空白');
    const pair = JSON.stringify([source, target]);
    if (seen.has(pair)) throw new Error('存在重复的来源与目标任务，请移除重复项');
    seen.add(pair);
    return { ...task, source, target };
  });
}
