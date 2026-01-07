// CenterTextPlugin.js
export const centerTextPlugin = (
  mainText = "60%",
  subText = "Present",
  mainColor = "#111",
  subColor = "#666"
) => ({
  id: "centerText",
  afterDraw: (chart) => {
    const { ctx } = chart;

    // Doughnut center from first arc
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;

    const { x, y } = meta.data[0];

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    

    // Main value
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = mainColor;
    ctx.fillText(mainText, x, y - 10);

    // Sub text
    ctx.font = "14px Arial";
    ctx.fillStyle = subColor;
    ctx.fillText(subText, x, y + 14);

    ctx.restore();
  }
});
