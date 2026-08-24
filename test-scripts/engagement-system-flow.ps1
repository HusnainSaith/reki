param([string]$BaseUrl = 'http://localhost:3011')
$ErrorActionPreference = 'Stop'
$results = [System.Collections.Generic.List[object]]::new()

function Call-Api([string]$Method, [string]$Path, $Body = $null, [string]$Token = '') {
  $headers = @{}
  if ($Token) { $headers.Authorization = "Bearer $Token" }
  $args = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $headers; UseBasicParsing = $true }
  if ($null -ne $Body) { $args.ContentType = 'application/json'; $args.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
  try {
    $response = Invoke-WebRequest @args
    $raw = $response.Content
    $status = [int]$response.StatusCode
  } catch {
    if (!$_.Exception.Response) { throw }
    $status = [int]$_.Exception.Response.StatusCode
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $raw = $reader.ReadToEnd(); $reader.Dispose()
  }
  $content = if ($raw) { $raw | ConvertFrom-Json } else { $null }
  return @{ Status = $status; Body = $content }
}
function Assert-Status([string]$Name, $Response, [int[]]$Expected) {
  $passed = $Expected -contains $Response.Status
  $results.Add([pscustomobject]@{ Test=$Name; Status=$Response.Status; Result=if($passed){'PASS'}else{'FAIL'} })
  if (!$passed) { throw "$Name expected $($Expected -join '/') but got $($Response.Status): $($Response.Body | ConvertTo-Json -Depth 6 -Compress)" }
}

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$email = "engagement-flow-$suffix@example.test"
$password = 'FlowTest!2026'
$token = ''
$guestToken = ''
try {
  $register = Call-Api POST '/auth/register' @{ email=$email; password=$password; name='Engagement Flow Test' }
  Assert-Status 'register user' $register @(201)
  $token = $register.Body.tokens.accessToken

  $guest = Call-Api POST '/auth/guest'
  Assert-Status 'create guest session' $guest @(201)
  $guestToken = $guest.Body.tokens.accessToken

  $venueList = Call-Api GET '/venues?city=Manchester&limit=2'
  Assert-Status 'discover venues' $venueList @(200)
  $v1 = $venueList.Body.venues[0]; $v2 = $venueList.Body.venues[1]
  if (!$v1.id -or !$v2.id) { throw 'Two venues are required for the system flow' }

  Assert-Status 'public review listing' (Call-Api GET "/venues/$($v1.id)/reviews?page=1&limit=20&sort=newest") @(200)
  Assert-Status 'review requires auth' (Call-Api POST "/venues/$($v1.id)/reviews" @{rating=5;vibeAccurate=$true}) @(401)
  Assert-Status 'guest review forbidden' (Call-Api POST "/venues/$($v1.id)/reviews" @{rating=5;vibeAccurate=$true} $guestToken) @(403)
  Assert-Status 'invalid review rejected' (Call-Api POST "/venues/$($v1.id)/reviews" @{rating=6;vibeAccurate=$true} $token) @(400)
  $review = Call-Api POST "/venues/$($v1.id)/reviews" @{rating=5;text='System flow review';vibeAccurate=$true} $token
  Assert-Status 'create review' $review @(201)
  $reviewId = $review.Body.review.id
  Assert-Status 'upsert existing review' (Call-Api POST "/venues/$($v1.id)/reviews" @{rating=4;text='Upserted';vibeAccurate=$false} $token) @(201)
  Assert-Status 'update owned review' (Call-Api PATCH "/reviews/$reviewId" @{rating=5;text='Patched';vibeAccurate=$true} $token) @(200)

  Assert-Status 'vibe accuracy vote' (Call-Api POST "/venues/$($v1.id)/vibe-accuracy-votes" @{accurate=$true;observedVibe='party'} $token) @(201)
  Assert-Status 'vibe vote upsert' (Call-Api POST "/venues/$($v1.id)/vibe-accuracy-votes" @{accurate=$false} $token) @(201)

  Assert-Status 'far check-in rejected' (Call-Api POST "/venues/$($v1.id)/check-ins" @{lat=0;lng=0;accuracy=15} $token) @(400)
  $checkIn = Call-Api POST "/venues/$($v1.id)/check-ins" @{lat=[double]$v1.lat;lng=[double]$v1.lng;accuracy=15} $token
  Assert-Status 'valid proximity check-in' $checkIn @(201)
  Assert-Status 'check-in cooldown enforced' (Call-Api POST "/venues/$($v1.id)/check-ins" @{lat=[double]$v1.lat;lng=[double]$v1.lng;accuracy=15} $token) @(400)
  Assert-Status 'check-in history' (Call-Api GET '/users/check-ins?page=1&limit=20' $null $token) @(200)

  Assert-Status 'record venue history' (Call-Api POST "/users/history/venues/$($v1.id)" @{source='home'} $token) @(201)
  Assert-Status 'upsert venue history' (Call-Api POST "/users/history/venues/$($v1.id)" @{source='search'} $token) @(201)
  Assert-Status 'get venue history' (Call-Api GET '/users/history/venues' $null $token) @(200)
  Assert-Status 'get achievements' (Call-Api GET '/users/achievements' $null $token) @(200)

  foreach ($period in @('weekly','monthly','all_time')) {
    Assert-Status "leaderboard $period" (Call-Api GET "/leaderboards?period=$period&city=manchester&limit=50") @(200)
  }
  Assert-Status 'track venue share' (Call-Api POST "/venues/$($v1.id)/shares" @{channel='copy_link'} $token) @(201)

  $now = [DateTime]::UtcNow.ToString('o')
  $actions = @(
    @{id=[guid]::NewGuid().ToString();type='REVIEW_CREATE';venueId=$v2.id;data=@{rating=5;text='Offline review';vibeAccurate=$true};offlineTimestamp=$now},
    @{id=[guid]::NewGuid().ToString();type='VIBE_ACCURACY_VOTE';venueId=$v2.id;data=@{accurate=$true};offlineTimestamp=$now},
    @{id=[guid]::NewGuid().ToString();type='CHECK_IN';venueId=$v2.id;data=@{lat=[double]$v2.lat;lng=[double]$v2.lng;accuracy=15};offlineTimestamp=$now},
    @{id=[guid]::NewGuid().ToString();type='VENUE_HISTORY_VIEW';venueId=$v2.id;data=@{source='map'};offlineTimestamp=$now},
    @{id=[guid]::NewGuid().ToString();type='VENUE_SHARE';venueId=$v2.id;data=@{channel='other'};offlineTimestamp=$now}
  )
  $sync = Call-Api POST '/sync/queue' @{deviceId="flow-device-$suffix";actions=$actions} $token
  Assert-Status 'offline sync action queue' $sync @(201)
  if (@($sync.Body.results | Where-Object status -ne 'success').Count -gt 0) { throw 'One or more offline actions failed' }
  $offlineReview = (Call-Api GET "/venues/$($v2.id)/reviews").Body.reviews[0]
  $updateAction = @{id=[guid]::NewGuid().ToString();type='REVIEW_UPDATE';venueId=$v2.id;data=@{reviewId=$offlineReview.id;rating=4;text='Offline updated';vibeAccurate=$false};offlineTimestamp=([DateTime]::UtcNow.ToString('o'))}
  $syncUpdate = Call-Api POST '/sync/queue' @{deviceId="flow-device-$suffix";actions=@($updateAction)} $token
  Assert-Status 'offline review update' $syncUpdate @(201)
  if ($syncUpdate.Body.results[0].status -ne 'success') { throw 'Offline review update failed' }

  Assert-Status 'delete owned review' (Call-Api DELETE "/reviews/$reviewId" $null $token) @(200)
  Assert-Status 'clear venue history' (Call-Api DELETE '/users/history/venues' $null $token) @(200)
}
finally {
  if ($token) { $cleanup = Call-Api DELETE '/users/account' $null $token; Assert-Status 'cleanup temporary user' $cleanup @(200) }
  if ($guestToken) { $guestCleanup = Call-Api DELETE '/users/account' $null $guestToken; Assert-Status 'cleanup temporary guest' $guestCleanup @(200) }
  $results | Format-Table -AutoSize
  $failed = @($results | Where-Object Result -eq 'FAIL').Count
  Write-Output "TOTAL=$($results.Count) PASSED=$($results.Count-$failed) FAILED=$failed"
}
