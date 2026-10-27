# Convert the handbook DOCX to PDF with Word, refreshing the TOC field first.
$ErrorActionPreference = "Stop"
$root = "D:\campusfeed\document"
$docx = Join-Path $root "CAMPUSFEED_TECHNICAL_HANDBOOK.docx"
$pdf = Join-Path $root "CAMPUSFEED_TECHNICAL_HANDBOOK.pdf"

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx, $false, $true)
    # Populate the TOC pandoc inserted as a field.
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Fields.Update() | Out-Null
    $doc.Repaginate()
    $pages = $doc.ComputeStatistics(2)   # wdStatisticPages
    $words = $doc.ComputeStatistics(0)   # wdStatisticWords
    if (Test-Path $pdf) { Remove-Item $pdf -Force }
    $doc.ExportAsFixedFormat($pdf, 17)   # wdExportFormatPDF
    $doc.Close($false)
    Write-Output "PDF_OK pages=$pages words=$words"
}
catch {
    Write-Output ("PDF_FAIL: " + $_.Exception.Message)
    Write-Output ($_.ScriptStackTrace)
    exit 1
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
