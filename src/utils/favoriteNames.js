/** 与页面显示一致地去掉首尾空白，保留名称内部的空格及连续空格。 */
export function normalizeFavoriteName(name) {
  return typeof name === 'string' ? name.trim() : '';
}

/** 在任何跳转或提交前检查整个任务列表；同时兼容旧版本保存的任务。 */
export function normalizeCopyTasks(tasks) {
  return tasks.map(task => {
    const source = normalizeFavoriteName(task.source);
    const target = normalizeFavoriteName(task.target);
    if (!source || !target) throw new Error('源收藏夹和目标收藏夹名称不能为空或仅包含空白');
    return { ...task, source, target };
  });
}
