export function forHtml(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[`"']/g, '&quot;');
}

export function forSql(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(/['"\\;&]/g, '');
}