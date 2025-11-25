// ✨ NEW FILE — /lib/exportPDF.ts
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportSurveyToPDF() {
  const exportElement = document.getElementById("export-section");
  if (!exportElement) return alert("Export section not found!");

  const canvas = await html2canvas(exportElement, {
    scale: 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");

  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = pdfHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
  heightLeft -= pdf.internal.pageSize.getHeight();

  while (heightLeft > 0) {
    pdf.addPage();
    position = heightLeft - pdfHeight;
    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();
  }

  pdf.save("Survey-Report.pdf");
}
