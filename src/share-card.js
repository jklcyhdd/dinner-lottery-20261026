const FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

export function wrapText(text, width, measure) {
  const lines = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const char of Array.from(paragraph)) {
      if (line && measure(line + char) > width) {
        const chars = Array.from(line);
        if (/^[，。！？；：、）】》」』,.!?;:%]$/.test(char) && chars.length > 1) {
          const tail = chars.splice(-Math.min(2, chars.length - 1)).join("");
          lines.push(chars.join(""));
          line = tail;
        } else {
          lines.push(line);
          line = "";
        }
      }
      line += char;
    }
    lines.push(line);
  }
  return lines;
}

export function layoutRecipeCard(recipe, measure) {
  const width = 390;
  const padding = 24;
  const inner = width - padding * 2;
  const blocks = [];
  let y = padding;
  function text(value, x, top, maxWidth, size = 15, lineHeight = 27, weight = 400, color = "#23362d") {
    const lines = wrapText(value, maxWidth, (line) => measure(line, size, weight));
    const height = lines.length * lineHeight;
    blocks.push({ type: "text", text: value, lines, x, y: top, size, lineHeight, weight, color, height });
    return height;
  }
  function heading(value) {
    y += 20;
    y += text(value, padding, y, inner, 17, 27, 650, "#22543d") + 8;
  }
  y += text("今晚吃什么", padding, y, inner, 13, 22, 650, "#22543d") + 12;
  blocks.push({ type: "image", x: padding, y, width: 108, height: 81 });
  let titleHeight = text(recipe.name, 148, y, width - 148 - padding, 23, 32, 700);
  titleHeight += text(`${recipe.method} · 1人份\n预计 ${recipe.minutes} 分钟`, 148, y + titleHeight + 6,
    width - 148 - padding, 14, 23, 400, "#5d6a61") + 6;
  y += Math.max(81, titleHeight) + 18;
  const pairing = "固定搭配：一小碗米饭＋一份炒青菜";
  const pairingHeight = wrapText(pairing, inner - 20, (line) => measure(line, 14, 600)).length * 24 + 18;
  blocks.push({ type: "box", x: padding, y, width: inner, height: pairingHeight, color: "#edf2ea" });
  text(pairing, padding + 10, y + 9, inner - 20, 14, 24, 600, "#22543d");
  y += pairingHeight;
  heading("一人份食材");
  const columnWidth = (inner - 16) / 2;
  for (let i = 0; i < recipe.ingredients.length; i += 2) {
    const left = text(recipe.ingredients[i], padding, y, columnWidth, 15, 25);
    const right = recipe.ingredients[i + 1]
      ? text(recipe.ingredients[i + 1], padding + columnWidth + 16, y, columnWidth, 15, 25) : 0;
    y += Math.max(left, right) + 5;
  }
  heading("照着做");
  recipe.steps.forEach((step, i) => {
    text(`${i + 1}.`, padding, y, 24, 15, 27, 650, "#9b512d");
    y += text(step, padding + 25, y, inner - 25) + 12;
  });
  heading("熟透判断");
  y += text(recipe.doneness, padding, y, inner);
  heading("调味建议");
  y += text(recipe.seasoning, padding, y, inner);
  y += 22;
  y += text("今晚请做这道，谢谢妈妈。", padding, y, inner, 14, 24, 600, "#22543d");
  if (recipe.source.startsWith("https://commons.wikimedia.org/")) {
    y += 12;
    y += text(`照片：${recipe.photoCredit} · 缩放转WebP\n来源：${recipe.source}`,
      padding, y, inner, 11, 19, 400, "#5d6a61");
  }
  return { width, height: Math.ceil(y + padding), blocks };
}

export async function renderRecipeImage(recipe) {
  const image = new Image();
  image.src = recipe.image;
  await image.decode();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法生成图片");
  const layout = layoutRecipeCard(recipe, (value, size, weight = 400) => {
    context.font = `${weight} ${size}px ${FONT}`;
    return context.measureText(value).width;
  });
  canvas.width = layout.width * 3;
  canvas.height = layout.height * 3;
  context.scale(3, 3);
  context.fillStyle = "#fffefa";
  context.fillRect(0, 0, layout.width, layout.height);
  context.textBaseline = "top";
  for (const block of layout.blocks) {
    if (block.type === "text") {
      context.font = `${block.weight} ${block.size}px ${FONT}`;
      context.fillStyle = block.color;
      block.lines.forEach((line, index) => context.fillText(line, block.x, block.y + index * block.lineHeight));
    } else if (block.type === "image") {
      const scale = Math.min(block.width / image.naturalWidth, block.height / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      context.drawImage(image, block.x + (block.width - w) / 2, block.y + (block.height - h) / 2, w, h);
    } else {
      context.fillStyle = block.color;
      context.fillRect(block.x, block.y, block.width, block.height);
    }
  }
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("生成图片失败，请重试")), "image/png"));
}
