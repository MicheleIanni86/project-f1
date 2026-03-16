$ErrorActionPreference = "Stop"

$workbookPath = Join-Path $PSScriptRoot "..\\Formula F1NTA 2026.xlsx"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("f1nta-xlsx-" + [System.Guid]::NewGuid().ToString("N"))
$extractPath = Join-Path $tempRoot "unzipped"
$zipPath = Join-Path $tempRoot "workbook.zip"
$sheetPath = Join-Path $extractPath "xl\\worksheets\\sheet1.xml"

New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
Copy-Item $workbookPath $zipPath
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

[xml]$sheetXml = Get-Content -Path $sheetPath
$ns = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
$ns.AddNamespace("a", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
$sheetData = $sheetXml.SelectSingleNode("//a:worksheet/a:sheetData", $ns)

function Get-OrCreate-Row {
    param(
        [xml]$Document,
        [System.Xml.XmlElement]$SheetData,
        [int]$RowIndex
    )

    $existing = $SheetData.SelectSingleNode("a:row[@r='$RowIndex']", $ns)
    if ($existing) {
        return $existing
    }

    $newRow = $Document.CreateElement("row", $ns.LookupNamespace("a"))
    $newRow.SetAttribute("r", [string]$RowIndex)

    $inserted = $false
    foreach ($row in $SheetData.SelectNodes("a:row", $ns)) {
        if ([int]$row.GetAttribute("r") -gt $RowIndex) {
            $SheetData.InsertBefore($newRow, $row) | Out-Null
            $inserted = $true
            break
        }
    }

    if (-not $inserted) {
        $SheetData.AppendChild($newRow) | Out-Null
    }

    return $newRow
}

function Remove-Cell {
    param(
        [System.Xml.XmlElement]$Row,
        [string]$CellRef
    )

    $node = $Row.SelectSingleNode("a:c[@r='$CellRef']", $ns)
    if ($node) {
        $Row.RemoveChild($node) | Out-Null
    }
}

function Add-Cell {
    param(
        [System.Xml.XmlElement]$Row,
        [string]$CellRef,
        [ValidateSet("inlineStr", "number", "formula")]
        [string]$Type,
        [string]$Value,
        [string]$Formula = "",
        [string]$Style = ""
    )

    Remove-Cell -Row $Row -CellRef $CellRef

    $cell = $sheetXml.CreateElement("c", $ns.LookupNamespace("a"))
    $cell.SetAttribute("r", $CellRef)
    if ($Style) {
        $cell.SetAttribute("s", $Style)
    }

    if ($Type -eq "inlineStr") {
        $cell.SetAttribute("t", "inlineStr")
        $is = $sheetXml.CreateElement("is", $ns.LookupNamespace("a"))
        $t = $sheetXml.CreateElement("t", $ns.LookupNamespace("a"))
        if ($Value -match '^\s|\s$') {
            $t.SetAttribute("xml:space", "preserve")
        }
        $t.InnerText = $Value
        $is.AppendChild($t) | Out-Null
        $cell.AppendChild($is) | Out-Null
    }

    if ($Type -eq "number") {
        $v = $sheetXml.CreateElement("v", $ns.LookupNamespace("a"))
        $v.InnerText = $Value
        $cell.AppendChild($v) | Out-Null
    }

    if ($Type -eq "formula") {
        $f = $sheetXml.CreateElement("f", $ns.LookupNamespace("a"))
        $f.InnerText = $Formula
        $cell.AppendChild($f) | Out-Null
        if ($Value -ne "") {
            $v = $sheetXml.CreateElement("v", $ns.LookupNamespace("a"))
            $v.InnerText = $Value
            $cell.AppendChild($v) | Out-Null
        }
    }

    $Row.AppendChild($cell) | Out-Null
}

$cells = @(
    @{ ref = "X11"; type = "inlineStr"; value = "TEST AUTOMAZIONE PUNTI"; style = "2" },
    @{ ref = "X12"; type = "inlineStr"; value = "Riga Poleman test"; style = "1" },
    @{ ref = "Z12"; type = "number"; value = "3"; style = "1" },
    @{ ref = "X13"; type = "inlineStr"; value = "Pole ufficiale"; style = "1" },
    @{ ref = "Z13"; type = "inlineStr"; value = "Russell"; style = "1" },
    @{ ref = "X14"; type = "inlineStr"; value = "1° ufficiale"; style = "1" },
    @{ ref = "Z14"; type = "inlineStr"; value = "Russell"; style = "1" },
    @{ ref = "X15"; type = "inlineStr"; value = "2° ufficiale"; style = "1" },
    @{ ref = "Z15"; type = "inlineStr"; value = "Antonelli"; style = "1" },
    @{ ref = "X16"; type = "inlineStr"; value = "3° ufficiale"; style = "1" },
    @{ ref = "Z16"; type = "inlineStr"; value = "Leclerc"; style = "1" },
    @{ ref = "X18"; type = "inlineStr"; value = "Punteggio test"; style = "2" },
    @{ ref = "AA18"; type = "inlineStr"; value = "Andrea"; style = "1" },
    @{ ref = "AB18"; type = "inlineStr"; value = "Giovanni"; style = "1" },
    @{ ref = "AC18"; type = "inlineStr"; value = "Luca"; style = "1" },
    @{ ref = "AD18"; type = "inlineStr"; value = "Marco"; style = "1" },
    @{ ref = "AE18"; type = "inlineStr"; value = "Michele"; style = "1" },
    @{ ref = "AF18"; type = "inlineStr"; value = "Salvo"; style = "1" },
    @{ ref = "X19"; type = "inlineStr"; value = "Totale"; style = "1" },
    @{ ref = "X20"; type = "inlineStr"; value = "Regola"; style = "1" },
    @{ ref = "Z20"; type = "inlineStr"; value = "Pole=2, esatta=3, podio=1"; style = "1" }
)

$scoreFormula = 'IF(INDEX($C:$H,$Z$12,COLUMN()-26)=$Z$13,2,0)+IF(INDEX($C:$H,$Z$12+1,COLUMN()-26)=$Z$14,3,IF(COUNTIF($Z$14:$Z$16,INDEX($C:$H,$Z$12+1,COLUMN()-26))>0,1,0))+IF(INDEX($C:$H,$Z$12+2,COLUMN()-26)=$Z$15,3,IF(COUNTIF($Z$14:$Z$16,INDEX($C:$H,$Z$12+2,COLUMN()-26))>0,1,0))+IF(INDEX($C:$H,$Z$12+3,COLUMN()-26)=$Z$16,3,IF(COUNTIF($Z$14:$Z$16,INDEX($C:$H,$Z$12+3,COLUMN()-26))>0,1,0))'
$formulaCells = @(
    @{ ref = "AA19"; value = "6" },
    @{ ref = "AB19"; value = "4" },
    @{ ref = "AC19"; value = "6" },
    @{ ref = "AD19"; value = "6" },
    @{ ref = "AE19"; value = "2" },
    @{ ref = "AF19"; value = "3" }
)

foreach ($cellDef in $cells) {
    $rowIndex = [int]([regex]::Match($cellDef.ref, "\d+").Value)
    $row = Get-OrCreate-Row -Document $sheetXml -SheetData $sheetData -RowIndex $rowIndex
    Add-Cell -Row $row -CellRef $cellDef.ref -Type $cellDef.type -Value $cellDef.value -Style $cellDef.style
}

foreach ($cellDef in $formulaCells) {
    $rowIndex = [int]([regex]::Match($cellDef.ref, "\d+").Value)
    $row = Get-OrCreate-Row -Document $sheetXml -SheetData $sheetData -RowIndex $rowIndex
    Add-Cell -Row $row -CellRef $cellDef.ref -Type "formula" -Value $cellDef.value -Formula $scoreFormula -Style "1"
}

$sheetXml.Save($sheetPath)

$backupPath = "$workbookPath.bak"
Copy-Item $workbookPath $backupPath -Force
Compress-Archive -Path (Join-Path $extractPath "*") -DestinationPath $zipPath -Force
Move-Item -Path $zipPath -Destination $workbookPath -Force

Remove-Item $tempRoot -Recurse -Force
