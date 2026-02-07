$watcher = New-Object IO.FileSystemWatcher
$watcher.Path = "c:\Users\ALJABAR\Documents\ListV1.2"
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "Change detected: $path ($changeType) at $timestamp"
    
    # Avoid infinite loop if the watcher detects its own changes (though shouldn't happen with .git ignored by git)
    if ($path -notmatch "\\.git\\") {
        cd "c:\Users\ALJABAR\Documents\ListV1.2"
        git add .
        git commit -m "Auto-update: $timestamp"
        git push origin main
        Write-Host "Pushed to GitHub."
    }
}

Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Deleted" -Action $action
Register-ObjectEvent $watcher "Renamed" -Action $action

Write-Host "Auto-push script is running... Press Ctrl+C to stop."
while ($true) { Start-Sleep -Seconds 1 }
