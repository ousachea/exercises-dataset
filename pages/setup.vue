<script setup lang="ts">
type Db = 'mssql' | 'postgresql' | 'mysql' | 'sqlite'
type Lang = 'curl' | 'js' | 'python' | 'csharp' | 'java' | 'php' | 'go'
type Endpoint = 'getOne' | 'getAll' | 'getFiltered'

useHead({ title: 'Developer Setup — ExerciseDB' })

// ── DB schema templates ───────────────────────────────
const DB_SQL: Record<Db, string> = {
  mssql: `CREATE TABLE exercises (
  id                NVARCHAR(10)  PRIMARY KEY,
  name              NVARCHAR(255) NOT NULL,
  category          NVARCHAR(100),
  body_part         NVARCHAR(100),
  equipment         NVARCHAR(100),
  instructions_en   NVARCHAR(MAX),
  instructions_es   NVARCHAR(MAX),
  instructions_it   NVARCHAR(MAX),
  instructions_tr   NVARCHAR(MAX),
  instructions_ru   NVARCHAR(MAX),
  instructions_zh   NVARCHAR(MAX),
  muscle_group      NVARCHAR(100),
  secondary_muscles NVARCHAR(MAX),  -- JSON array stored as string
  target            NVARCHAR(100),
  image             NVARCHAR(500),
  gif_url           NVARCHAR(500),
  created_at        DATETIME2
);`,
  postgresql: `CREATE TABLE exercises (
  id                VARCHAR(10)  PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  category          VARCHAR(100),
  body_part         VARCHAR(100),
  equipment         VARCHAR(100),
  instructions_en   TEXT,
  instructions_es   TEXT,
  instructions_it   TEXT,
  instructions_tr   TEXT,
  instructions_ru   TEXT,
  instructions_zh   TEXT,
  muscle_group      VARCHAR(100),
  secondary_muscles JSONB,
  target            VARCHAR(100),
  image             VARCHAR(500),
  gif_url           VARCHAR(500),
  created_at        TIMESTAMPTZ
);`,
  mysql: `CREATE TABLE exercises (
  id                VARCHAR(10)  PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  category          VARCHAR(100),
  body_part         VARCHAR(100),
  equipment         VARCHAR(100),
  instructions_en   TEXT,
  instructions_es   TEXT,
  instructions_it   TEXT,
  instructions_tr   TEXT,
  instructions_ru   TEXT,
  instructions_zh   TEXT,
  muscle_group      VARCHAR(100),
  secondary_muscles JSON,
  target            VARCHAR(100),
  image             VARCHAR(500),
  gif_url           VARCHAR(500),
  created_at        DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  sqlite: `CREATE TABLE exercises (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  category          TEXT,
  body_part         TEXT,
  equipment         TEXT,
  instructions_en   TEXT,
  instructions_es   TEXT,
  instructions_it   TEXT,
  instructions_tr   TEXT,
  instructions_ru   TEXT,
  instructions_zh   TEXT,
  muscle_group      TEXT,
  secondary_muscles TEXT,  -- JSON array stored as string
  target            TEXT,
  image             TEXT,
  gif_url           TEXT,
  created_at        TEXT
);`
}

const DB_TABS: { db: Db; label: string }[] = [
  { db: 'mssql', label: 'SQL Server' },
  { db: 'postgresql', label: 'PostgreSQL' },
  { db: 'mysql', label: 'MySQL' },
  { db: 'sqlite', label: 'SQLite' }
]

// ── API code snippet templates ────────────────────────
const API_TEMPLATES: Record<Lang, Record<Endpoint, (base: string) => string>> = {
  curl: {
    getOne: (base) => `# GET single exercise by ID
curl -s "${base}/exercises/0001"

# Pretty-print the response (Python 3 built-in)
curl -s "${base}/exercises/0001" | python3 -m json.tool`,
    getAll: (base) => `# GET all exercises — page 1, 20 per page
curl -s "${base}/exercises?page=1&limit=20"

# Page 2, 50 per page
curl -s "${base}/exercises?page=2&limit=50"

# Response shape:
# {
#   "data": [ ...exercises ],
#   "total": 1324,
#   "page": 1,
#   "limit": 20,
#   "totalPages": 67
# }`,
    getFiltered: (base) => `# Filter by category
curl -s "${base}/exercises?category=Strength&page=1&limit=20"

# Filter by body part
curl -s "${base}/exercises?body_part=Chest&page=1&limit=20"

# Combine filters
curl -s "${base}/exercises?category=Strength&body_part=Chest&page=1&limit=20"

# With equipment filter
curl -s "${base}/exercises?equipment=Barbell&target=Pectorals&page=1&limit=20"`
  },
  js: {
    getOne: (base) => `const BASE_URL = '${base}';

// GET /exercises/:id — fetch a single exercise
async function getExercise(id) {
  const res = await fetch(\`\${BASE_URL}/exercises/\${id}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}

// Usage
const exercise = await getExercise('0001');
console.log(exercise.name);        // "Barbell Bench Press"
console.log(exercise.category);    // "Strength"
console.log(exercise.gif_url);     // "videos/0001.gif"`,
    getAll: (base) => `const BASE_URL = '${base}';

// GET /exercises?page=&limit= — paginated list
async function getExercises({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  const res = await fetch(\`\${BASE_URL}/exercises?\${params}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}

// Usage
const result = await getExercises({ page: 1, limit: 20 });
console.log(result.data);       // Array of exercises
console.log(result.total);      // 1324
console.log(result.page);       // 1
console.log(result.totalPages); // 67`,
    getFiltered: (base) => `const BASE_URL = '${base}';

// GET /exercises with filters
async function getExercisesFiltered({
  page = 1,
  limit = 20,
  category,
  bodyPart,
  equipment,
  target,
} = {}) {
  const params = new URLSearchParams({ page, limit });
  if (category)  params.set('category', category);
  if (bodyPart)  params.set('body_part', bodyPart);
  if (equipment) params.set('equipment', equipment);
  if (target)    params.set('target', target);

  const res = await fetch(\`\${BASE_URL}/exercises?\${params}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}

// Usage
const result = await getExercisesFiltered({
  category: 'Strength',
  bodyPart: 'Chest',
  page: 1,
  limit: 20,
});
console.log(result.data[0].name); // e.g. "Barbell Bench Press"`
  },
  python: {
    getOne: (base) => `import requests

BASE_URL = "${base}"

# GET /exercises/:id — fetch a single exercise
def get_exercise(exercise_id: str) -> dict:
    res = requests.get(f"{BASE_URL}/exercises/{exercise_id}")
    res.raise_for_status()
    return res.json()

# Usage
exercise = get_exercise("0001")
print(exercise["name"])      # Barbell Bench Press
print(exercise["category"])  # Strength
print(exercise["gif_url"])   # videos/0001.gif`,
    getAll: (base) => `import requests

BASE_URL = "${base}"

# GET /exercises?page=&limit= — paginated list
def get_exercises(page: int = 1, limit: int = 20) -> dict:
    res = requests.get(f"{BASE_URL}/exercises", params={
        "page": page,
        "limit": limit,
    })
    res.raise_for_status()
    return res.json()

# Usage
result = get_exercises(page=1, limit=20)
print(result["data"])        # list of exercises
print(result["total"])       # 1324
print(result["page"])        # 1
print(result["totalPages"])  # 67`,
    getFiltered: (base) => `import requests

BASE_URL = "${base}"

# GET /exercises with filters
def get_exercises_filtered(
    page: int = 1,
    limit: int = 20,
    category: str = None,
    body_part: str = None,
    equipment: str = None,
    target: str = None,
) -> dict:
    params = {"page": page, "limit": limit}
    if category:  params["category"]  = category
    if body_part: params["body_part"] = body_part
    if equipment: params["equipment"] = equipment
    if target:    params["target"]    = target

    res = requests.get(f"{BASE_URL}/exercises", params=params)
    res.raise_for_status()
    return res.json()

# Usage
result = get_exercises_filtered(
    category="Strength",
    body_part="Chest",
    page=1,
    limit=20,
)
print(result["data"][0]["name"])  # e.g. Barbell Bench Press`
  },
  csharp: {
    getOne: (base) => `using System.Net.Http.Json;

var client = new HttpClient { BaseAddress = new Uri("${base}") };

// GET /exercises/:id — fetch a single exercise
async Task<Exercise?> GetExerciseAsync(string id)
{
    var res = await client.GetAsync($"/exercises/{id}");
    res.EnsureSuccessStatusCode();
    return await res.Content.ReadFromJsonAsync<Exercise>();
}

// Usage
var exercise = await GetExerciseAsync("0001");
Console.WriteLine(exercise?.Name);     // Barbell Bench Press
Console.WriteLine(exercise?.Category); // Strength
Console.WriteLine(exercise?.GifUrl);   // videos/0001.gif

// Model
record Exercise(
    string Id, string Name, string Category, string BodyPart,
    string Equipment, string? InstructionsEn, string? InstructionsEs, string? InstructionsIt, string? InstructionsTr, string? InstructionsRu,
    string MuscleGroup, string[] SecondaryMuscles, string Target,
    string Image, string GifUrl, string? CreatedAt
);`,
    getAll: (base) => `using System.Net.Http.Json;

var client = new HttpClient { BaseAddress = new Uri("${base}") };

// GET /exercises?page=&limit= — paginated list
async Task<PagedResult<Exercise>> GetExercisesAsync(int page = 1, int limit = 20)
{
    return await client.GetFromJsonAsync<PagedResult<Exercise>>(
        $"/exercises?page={page}&limit={limit}"
    ) ?? throw new Exception("Null response");
}

// Usage
var result = await GetExercisesAsync(page: 1, limit: 20);
Console.WriteLine(result.Total);      // 1324
Console.WriteLine(result.TotalPages); // 67

// Models
record Exercise(string Id, string Name, string Category, string BodyPart,
    string Equipment, string? InstructionsEn, string Target, string GifUrl);
record PagedResult<T>(T[] Data, int Total, int Page, int Limit, int TotalPages);`,
    getFiltered: (base) => `using System.Net.Http.Json;
using System.Web;

var client = new HttpClient { BaseAddress = new Uri("${base}") };

// GET /exercises with filters
async Task<PagedResult<Exercise>> GetExercisesFilteredAsync(
    int page = 1, int limit = 20,
    string? category = null, string? bodyPart = null,
    string? equipment = null, string? target = null)
{
    var qs = HttpUtility.ParseQueryString(string.Empty);
    qs["page"]  = page.ToString();
    qs["limit"] = limit.ToString();
    if (category  != null) qs["category"]  = category;
    if (bodyPart  != null) qs["body_part"] = bodyPart;
    if (equipment != null) qs["equipment"] = equipment;
    if (target    != null) qs["target"]    = target;

    return await client.GetFromJsonAsync<PagedResult<Exercise>>(
        $"/exercises?{qs}"
    ) ?? throw new Exception("Null response");
}

// Usage
var result = await GetExercisesFilteredAsync(
    category: "Strength", bodyPart: "Chest", page: 1, limit: 20);
Console.WriteLine(result.Data[0].Name); // e.g. Barbell Bench Press`
  },
  java: {
    getOne: (base) => `import java.net.URI;
import java.net.http.*;

HttpClient client = HttpClient.newHttpClient();
String BASE_URL = "${base}";

// GET /exercises/:id — fetch a single exercise
String getExercise(String id) throws Exception {
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(BASE_URL + "/exercises/" + id))
        .header("Accept", "application/json")
        .GET()
        .build();

    HttpResponse<String> response =
        client.send(request, HttpResponse.BodyHandlers.ofString());

    if (response.statusCode() != 200)
        throw new RuntimeException("HTTP " + response.statusCode());

    return response.body(); // parse with Jackson/Gson
}

// Usage (with Jackson ObjectMapper)
// ObjectMapper mapper = new ObjectMapper();
// Map<?,?> exercise = mapper.readValue(getExercise("0001"), Map.class);`,
    getAll: (base) => `import java.net.URI;
import java.net.http.*;

HttpClient client = HttpClient.newHttpClient();
String BASE_URL = "${base}";

// GET /exercises?page=&limit= — paginated list
String getExercises(int page, int limit) throws Exception {
    String url = BASE_URL + "/exercises?page=" + page + "&limit=" + limit;

    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(url))
        .header("Accept", "application/json")
        .GET()
        .build();

    HttpResponse<String> response =
        client.send(request, HttpResponse.BodyHandlers.ofString());

    return response.body();
    // { "data": [...], "total": 1324, "page": 1, "limit": 20, "totalPages": 67 }
}

// Usage
String json = getExercises(1, 20);`,
    getFiltered: (base) => `import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;

HttpClient client = HttpClient.newHttpClient();
String BASE_URL = "${base}";

// GET /exercises with filters
String getExercisesFiltered(
    int page, int limit,
    String category, String bodyPart, String equipment
) throws Exception {
    StringBuilder url = new StringBuilder(
        BASE_URL + "/exercises?page=" + page + "&limit=" + limit
    );
    if (category  != null)
        url.append("&category=").append(URLEncoder.encode(category, StandardCharsets.UTF_8));
    if (bodyPart  != null)
        url.append("&body_part=").append(URLEncoder.encode(bodyPart, StandardCharsets.UTF_8));
    if (equipment != null)
        url.append("&equipment=").append(URLEncoder.encode(equipment, StandardCharsets.UTF_8));

    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(url.toString()))
        .header("Accept", "application/json")
        .GET()
        .build();

    return client.send(request, HttpResponse.BodyHandlers.ofString()).body();
}

// Usage
String json = getExercisesFiltered(1, 20, "Strength", "Chest", null);`
  },
  php: {
    getOne: (base) => `<?php

define('BASE_URL', '${base}');

// GET /exercises/:id — fetch a single exercise
function getExercise(string $id): array
{
    $url  = BASE_URL . '/exercises/' . urlencode($id);
    $json = file_get_contents($url);
    if ($json === false) throw new RuntimeException("Request failed");
    return json_decode($json, true);
}

// Usage
$exercise = getExercise('0001');
echo $exercise['name'];      // Barbell Bench Press
echo $exercise['category'];  // Strength
echo $exercise['gif_url'];   // videos/0001.gif`,
    getAll: (base) => `<?php

define('BASE_URL', '${base}');

// GET /exercises?page=&limit= — paginated list
function getExercises(int $page = 1, int $limit = 20): array
{
    $params = http_build_query(['page' => $page, 'limit' => $limit]);
    $json   = file_get_contents(BASE_URL . '/exercises?' . $params);
    if ($json === false) throw new RuntimeException("Request failed");
    return json_decode($json, true);
}

// Usage
$result = getExercises(1, 20);
print_r($result['data']);       // array of exercises
echo $result['total'];          // 1324
echo $result['totalPages'];     // 67`,
    getFiltered: (base) => `<?php

define('BASE_URL', '${base}');

// GET /exercises with filters
function getExercisesFiltered(
    int $page = 1,
    int $limit = 20,
    ?string $category  = null,
    ?string $bodyPart  = null,
    ?string $equipment = null,
    ?string $target    = null
): array {
    $params = ['page' => $page, 'limit' => $limit];
    if ($category)  $params['category']  = $category;
    if ($bodyPart)  $params['body_part'] = $bodyPart;
    if ($equipment) $params['equipment'] = $equipment;
    if ($target)    $params['target']    = $target;

    $json = file_get_contents(BASE_URL . '/exercises?' . http_build_query($params));
    if ($json === false) throw new RuntimeException("Request failed");
    return json_decode($json, true);
}

// Usage
$result = getExercisesFiltered(1, 20, 'Strength', 'Chest');
echo $result['data'][0]['name']; // e.g. Barbell Bench Press`
  },
  go: {
    getOne: (base) => `package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

const baseURL = "${base}"

// GetExercise fetches a single exercise by ID
func GetExercise(id string) (map[string]any, error) {
    resp, err := http.Get(baseURL + "/exercises/" + id)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
    }

    var result map[string]any
    return result, json.NewDecoder(resp.Body).Decode(&result)
}

// Usage
func main() {
    exercise, err := GetExercise("0001")
    if err != nil { panic(err) }
    fmt.Println(exercise["name"])     // Barbell Bench Press
    fmt.Println(exercise["category"]) // Strength
}`,
    getAll: (base) => `package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
    "strconv"
)

const baseURL = "${base}"

// GetExercises fetches paginated exercises
func GetExercises(page, limit int) (map[string]any, error) {
    params := url.Values{
        "page":  {strconv.Itoa(page)},
        "limit": {strconv.Itoa(limit)},
    }
    resp, err := http.Get(baseURL + "/exercises?" + params.Encode())
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]any
    return result, json.NewDecoder(resp.Body).Decode(&result)
}

// Usage
func main() {
    result, err := GetExercises(1, 20)
    if err != nil { panic(err) }
    fmt.Println(result["total"])      // 1324
    fmt.Println(result["totalPages"]) // 67
}`,
    getFiltered: (base) => `package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
    "strconv"
)

const baseURL = "${base}"

// GetExercisesFiltered fetches exercises with optional filters
func GetExercisesFiltered(page, limit int, category, bodyPart, equipment string) (map[string]any, error) {
    params := url.Values{
        "page":  {strconv.Itoa(page)},
        "limit": {strconv.Itoa(limit)},
    }
    if category  != "" { params.Set("category",  category) }
    if bodyPart  != "" { params.Set("body_part", bodyPart) }
    if equipment != "" { params.Set("equipment", equipment) }

    resp, err := http.Get(baseURL + "/exercises?" + params.Encode())
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]any
    return result, json.NewDecoder(resp.Body).Decode(&result)
}

// Usage
func main() {
    result, err := GetExercisesFiltered(1, 20, "Strength", "Chest", "")
    if err != nil { panic(err) }
    data := result["data"].([]any)
    fmt.Println(data[0].(map[string]any)["name"]) // e.g. Barbell Bench Press
}`
  }
}

const LANG_TABS: { lang: Lang; label: string }[] = [
  { lang: 'curl', label: 'cURL' },
  { lang: 'js', label: 'JavaScript' },
  { lang: 'python', label: 'Python' },
  { lang: 'csharp', label: 'C#' },
  { lang: 'java', label: 'Java' },
  { lang: 'php', label: 'PHP' },
  { lang: 'go', label: 'Go' }
]

const ENDPOINTS: { key: Endpoint; path: string; hint: string; desc: string }[] = [
  { key: 'getOne', path: '/exercises/', hint: ':id', desc: 'Fetch a single exercise by ID' },
  { key: 'getAll', path: '/exercises', hint: '?page=1&limit=20', desc: 'Paginated list of exercises' },
  { key: 'getFiltered', path: '/exercises', hint: '?category=Strength&body_part=Chest', desc: 'Filter by category, body part, equipment' }
]

// ── LLM prompt builder ────────────────────────────────
type FwKey = 'express' | 'fastapi' | 'aspnet' | 'spring' | 'laravel' | 'gin'
const FRAMEWORK_META: Record<FwKey, { name: string; lang: string; pkg: string; run: string }> = {
  express: { name: 'Express.js (Node.js)', lang: 'JavaScript', pkg: 'express, pg / mysql2 / better-sqlite3', run: 'node index.js' },
  fastapi: { name: 'FastAPI (Python)', lang: 'Python', pkg: 'fastapi, uvicorn, sqlalchemy, psycopg2-binary', run: 'uvicorn main:app --reload' },
  aspnet: { name: 'ASP.NET Core (C#)', lang: 'C#', pkg: 'Npgsql / MySql.Data / Microsoft.Data.Sqlite', run: 'dotnet run' },
  spring: { name: 'Spring Boot (Java)', lang: 'Java', pkg: 'spring-web, spring-data-jpa, db driver', run: 'mvn spring-boot:run' },
  laravel: { name: 'Laravel (PHP)', lang: 'PHP', pkg: 'laravel/laravel, db driver', run: 'php artisan serve' },
  gin: { name: 'Gin (Go)', lang: 'Go', pkg: 'gin-gonic/gin, database/sql + db driver', run: 'go run main.go' }
}
const FW_TABS: { fw: FwKey; label: string }[] = [
  { fw: 'express', label: 'Express.js' },
  { fw: 'fastapi', label: 'FastAPI' },
  { fw: 'aspnet', label: 'ASP.NET Core' },
  { fw: 'spring', label: 'Spring Boot' },
  { fw: 'laravel', label: 'Laravel' },
  { fw: 'gin', label: 'Gin (Go)' }
]
const DB_NAMES: Record<Db, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mssql: 'SQL Server',
  sqlite: 'SQLite'
}

function buildLlmPrompt(fwKey: FwKey, dbKey: Db): string {
  const fw = FRAMEWORK_META[fwKey]
  const schema = DB_SQL[dbKey]
  return `You are a senior ${fw.lang} developer. Build a complete REST API using ${fw.name} for an exercise/fitness database.

## Dataset Overview
- 1,324 fitness exercises
- Fields: id (string, e.g. "0001"), name, category, body_part, equipment, instructions_en (full text), instructions_es (Spanish text), instructions_it (Italian text), instructions_tr (Turkish text), instructions_ru (Russian text), instructions_zh (Chinese text), muscle_group, secondary_muscles (JSON array of strings), target, image (relative path like "images/0001.jpg"), gif_url (relative path like "videos/0001.gif"), created_at

## Database Schema (${DB_NAMES[dbKey]})
\`\`\`sql
${schema}
\`\`\`

## Required Endpoints

### 1. GET /exercises/:id
- Return a single exercise by its id
- Return 404 JSON error if not found: { "error": "Exercise not found" }

### 2. GET /exercises
Query parameters (all optional):
- page (integer, default: 1)
- limit (integer, default: 20, max: 100)
- category (string, case-insensitive partial match)
- body_part (string, case-insensitive partial match)
- equipment (string, case-insensitive partial match)
- muscle_group (string, case-insensitive partial match)
- target (string, case-insensitive partial match)

Response format:
\`\`\`json
{
  "data": [ /* array of exercise objects */ ],
  "total": 1324,
  "page": 1,
  "limit": 20,
  "totalPages": 67
}
\`\`\`

### 3. GET /exercises/random
- Return 1 random exercise object

### 4. GET /categories
- Return sorted array of unique category strings

### 5. GET /body-parts
- Return sorted array of unique body_part strings

### 6. GET /equipment
- Return sorted array of unique equipment strings

## Technical Requirements
- Read DB connection string from an environment variable
- Use parameterized queries (never interpolate user input into SQL)
- Return JSON with Content-Type: application/json
- Enable CORS for all origins (or read allowed origins from env var \`ALLOWED_ORIGINS\`)
- Validate page/limit: must be positive integers; reject with 400 if invalid
- Return 500 with { "error": "Internal server error" } on unexpected errors
- Log each request: method, path, status code, duration in ms

## Packages to use
${fw.pkg}

## Deliverables
1. Complete, runnable source code (not pseudocode — every file needed)
2. Brief setup instructions:
   - Install dependencies
   - Run: \`${fw.run}\`

Write clean, production-quality code. Do not skip error handling.`
}

// ── Reactive state ────────────────────────────────────
const currentDb = ref<Db>('mssql')
const currentLang = ref<Lang>('curl')
const baseUrl = ref('https://api.yourapp.com')
const currentFw = ref<FwKey>('express')
const currentLlmDb = ref<Db>('postgresql')

const createSql = computed(() => DB_SQL[currentDb.value])
const effectiveBase = computed(() => baseUrl.value.trim() || 'https://api.yourapp.com')
const llmPrompt = computed(() => buildLlmPrompt(currentFw.value, currentLlmDb.value))

const generateStatus = ref('')

function downloadSql() {
  generateStatus.value = 'Preparing download…'
  const a = document.createElement('a')
  a.href = `/api/export-sql?db=${currentDb.value}`
  a.download = `exercises_insert_${currentDb.value}.sql`
  document.body.appendChild(a)
  a.click()
  a.remove()
  generateStatus.value = `✓ Downloading exercises_insert_${currentDb.value}.sql`
}

// ── Copy helpers ──────────────────────────────────────
const copied = ref<string | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | undefined
async function copy(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = id
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copied.value = null), 2000)
  } catch {
    /* clipboard unavailable */
  }
}

// ── Scrollspy ─────────────────────────────────────────
const activeSection = ref('db-setup')
let observer: IntersectionObserver | null = null

onMounted(() => {
  const sections = document.querySelectorAll('section[id]')
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) activeSection.value = e.target.id
      })
    },
    { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
  )
  sections.forEach((s) => observer!.observe(s))
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(copyTimer)
})
</script>

<template>
  <div>
    <header class="site-header">
      <div class="site-logo">Exercise<span>DB</span></div>
      <div class="header-divider" />
      <span class="header-label">Developer Setup</span>
      <NuxtLink class="back-link" to="/">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 4L6 8l4 4" />
        </svg>
        Back to Browse
      </NuxtLink>
    </header>

    <div class="page-shell">
      <!-- Left nav -->
      <nav class="page-nav">
        <div class="nav-group-label">Contents</div>
        <a class="nav-link" :class="{ active: activeSection === 'db-setup' }" href="#db-setup">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="8" cy="4" rx="6" ry="2.5" />
            <path d="M2 4v3c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V4" />
            <path d="M2 7v3c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V7" />
            <path d="M2 10v2c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-2" />
          </svg>
          Database Setup
        </a>
        <div class="nav-spacer" />
        <a class="nav-link" :class="{ active: activeSection === 'api-integration' }" href="#api-integration">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="5 4 1 8 5 12" />
            <polyline points="11 4 15 8 11 12" />
            <line x1="8" y1="2" x2="8" y2="14" />
          </svg>
          API Integration
        </a>
        <div class="nav-spacer" />
        <a class="nav-link" :class="{ active: activeSection === 'ask-llm' }" href="#ask-llm">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3l3 2 3-2h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
            <path d="M8 6v2M8 10h.01" />
          </svg>
          Ask Your LLM
        </a>
      </nav>

      <!-- Main -->
      <main class="page-content">
        <!-- Section 1: Database Setup -->
        <section id="db-setup" class="section">
          <div class="section-header">
            <div class="section-num">1</div>
            <h2 class="section-title">Database Setup</h2>
          </div>
          <p class="section-desc">Import all 1,324 exercises into your database in 3 steps. Choose your database engine below.</p>

          <div class="section-body">
            <div class="tab-bar" role="tablist">
              <button v-for="t in DB_TABS" :key="t.db" class="tab-btn" :class="{ active: currentDb === t.db }" role="tab" @click="currentDb = t.db">
                {{ t.label }}
              </button>
            </div>

            <div class="step-list">
              <!-- Step 1 -->
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-body">
                  <h3 class="step-title">Create Table</h3>
                  <p class="step-desc">Run this in your database client (SSMS, DBeaver, pgAdmin, TablePlus, etc.):</p>
                  <div class="code-block">
                    <button class="copy-btn" :class="{ copied: copied === 'create' }" @click="copy(createSql, 'create')">
                      {{ copied === 'create' ? 'Copied!' : 'Copy' }}
                    </button>
                    <pre class="code-pre">{{ createSql }}</pre>
                  </div>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-body">
                  <h3 class="step-title">Import Data</h3>
                  <p class="step-desc">Generate a <code>.sql</code> file with all 1,324 INSERT statements — the file is built by the server and streamed straight to your download.</p>
                  <div style="display: flex; align-items: center; gap: 0">
                    <button class="generate-btn" @click="downloadSql">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                        <path d="M8 2v8M5 7l3 3 3-3" />
                        <path d="M2 12h12" />
                      </svg>
                      Generate INSERT SQL
                    </button>
                    <span class="generate-status">{{ generateStatus }}</span>
                  </div>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-body">
                  <h3 class="step-title">Media Files</h3>
                  <p class="step-desc">The <code>image</code> and <code>gif_url</code> columns store relative paths — prepend your own base URL in your app.</p>
                  <div class="code-block">
                    <pre class="code-pre">your-server.com/
├── images/   ← 1,324 JPG thumbnails
└── videos/   ← 1,324 GIF animations</pre>
                  </div>
                  <div class="media-note">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 7v4M8 5.5h.01" />
                    </svg>
                    The exercise media is <strong>not bundled</strong> with this repository. Each record keeps a <code>media_id</code> so the browser can load animations from the public ExerciseDB CDN (configurable via <code>NUXT_PUBLIC_MEDIA_BASE</code>). To self-host, drop your own <code>images/</code> and <code>videos/</code> folders on your server or CDN.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="divider" />

        <!-- Section 2: API Integration -->
        <section id="api-integration" class="section">
          <div class="section-header">
            <div class="section-num">2</div>
            <h2 class="section-title">API Integration</h2>
          </div>
          <p class="section-desc">Client-side code examples showing how to call your backend API from your app. Enter your API base URL below — all examples update live.</p>

          <div class="section-body">
            <div class="url-input-row">
              <span class="url-label">BASE URL</span>
              <input v-model="baseUrl" type="url" class="url-input" placeholder="https://api.yourapp.com" spellcheck="false" />
            </div>

            <div class="tab-bar" role="tablist">
              <button v-for="t in LANG_TABS" :key="t.lang" class="tab-btn" :class="{ active: currentLang === t.lang }" role="tab" @click="currentLang = t.lang">
                {{ t.label }}
              </button>
            </div>

            <div class="endpoint-list">
              <div v-for="ep in ENDPOINTS" :key="ep.key" class="endpoint-card">
                <div class="endpoint-header">
                  <span class="method-badge">GET</span>
                  <span class="endpoint-path">{{ ep.path }}<span class="endpoint-hint">{{ ep.hint }}</span></span>
                  <span class="endpoint-desc">{{ ep.desc }}</span>
                </div>
                <div class="endpoint-body">
                  <div class="code-block">
                    <button class="copy-btn" :class="{ copied: copied === ep.key }" @click="copy(API_TEMPLATES[currentLang][ep.key](effectiveBase), ep.key)">
                      {{ copied === ep.key ? 'Copied!' : 'Copy' }}
                    </button>
                    <pre class="code-pre api-code">{{ API_TEMPLATES[currentLang][ep.key](effectiveBase) }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="divider" />

        <!-- Section 3: Ask Your LLM -->
        <section id="ask-llm" class="section">
          <div class="section-header">
            <div class="section-num">3</div>
            <h2 class="section-title">Ask Your LLM</h2>
          </div>
          <p class="section-desc">
            Don't want to write a backend from scratch? Copy this prompt into ChatGPT, Claude, Gemini, or any LLM — it contains everything needed to generate a complete, production-ready API in one shot.
          </p>

          <div class="section-body">
            <div class="llm-selectors">
              <div class="selector-group">
                <div class="selector-label">Framework</div>
                <div class="selector-tabs">
                  <button v-for="t in FW_TABS" :key="t.fw" class="selector-btn" :class="{ active: currentFw === t.fw }" @click="currentFw = t.fw">
                    {{ t.label }}
                  </button>
                </div>
              </div>
              <div class="selector-group">
                <div class="selector-label">Database</div>
                <div class="selector-tabs">
                  <button v-for="t in DB_TABS" :key="t.db" class="selector-btn" :class="{ active: currentLlmDb === t.db }" @click="currentLlmDb = t.db">
                    {{ t.label }}
                  </button>
                </div>
              </div>
            </div>

            <div class="llm-prompt-wrap">
              <textarea class="llm-prompt-box" readonly spellcheck="false" :value="llmPrompt" />
            </div>
            <div class="llm-actions">
              <button class="copy-prompt-btn" :class="{ copied: copied === 'prompt' }" @click="copy(llmPrompt, 'prompt')">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="4" width="9" height="11" rx="1.5" />
                  <path d="M11 4V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1" />
                </svg>
                {{ copied === 'prompt' ? '✓ Copied!' : 'Copy Prompt' }}
              </button>
              <span class="llm-hint">Paste into ChatGPT, Claude, Gemini, or any LLM</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style>
.site-header {
  background: #fff;
  border-bottom: 1px solid #e4e4e7;
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 20px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.site-logo {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: #111;
}
.site-logo span {
  color: #ff4f00;
}
.back-link {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #71717a;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  padding: 4px 11px;
  margin-left: auto;
  transition: color 0.15s, border-color 0.15s;
  text-decoration: none;
}
.back-link:hover {
  color: #111;
  border-color: #c4c4c7;
}
.back-link svg {
  flex-shrink: 0;
}
.header-divider {
  width: 1px;
  height: 20px;
  background: #e4e4e7;
}
.header-label {
  font-size: 13px;
  color: #71717a;
}

.page-shell {
  display: grid;
  grid-template-columns: 210px 1fr;
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 16px;
  min-height: calc(100vh - 52px);
}

.page-nav {
  position: sticky;
  top: 52px;
  height: calc(100vh - 52px);
  overflow-y: auto;
  padding: 32px 0;
  border-right: 1px solid #e4e4e7;
}
.nav-group-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #a1a1aa;
  padding: 0 16px 8px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 7px 16px;
  border-radius: 0 10px 10px 0;
  color: #71717a;
  transition: color 0.15s, background 0.15s;
  cursor: pointer;
  border-left: 2px solid transparent;
  margin-right: 12px;
  text-decoration: none;
}
.nav-link:hover {
  color: #111;
  background: #f0f0f1;
}
.nav-link.active {
  color: #ff4f00;
  background: rgba(255, 79, 0, 0.09);
  border-left-color: #ff4f00;
  font-weight: 500;
}
.nav-link svg {
  opacity: 0.5;
  flex-shrink: 0;
}
.nav-link.active svg {
  opacity: 1;
}
.nav-spacer {
  height: 20px;
}

.page-content {
  padding: 48px 0 80px 48px;
  max-width: 820px;
}

.section {
  margin-bottom: 72px;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 6px;
}
.section-num {
  width: 30px;
  height: 30px;
  background: #ff4f00;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.section-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.4px;
}
.section-desc {
  font-size: 14px;
  color: #71717a;
  margin-bottom: 24px;
  padding-left: 44px;
  max-width: 620px;
  line-height: 1.65;
}
.section-body {
  padding-left: 44px;
}

.tab-bar {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid #e4e4e7;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.tab-btn {
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: #71717a;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.tab-btn:hover {
  color: #111;
}
.tab-btn.active {
  color: #ff4f00;
  border-bottom-color: #ff4f00;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.step {
  display: flex;
  gap: 16px;
}
.step-num {
  width: 24px;
  height: 24px;
  background: #ff4f00;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.step-body {
  flex: 1;
  min-width: 0;
}
.step-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}
.step-desc {
  font-size: 13px;
  color: #71717a;
  margin-bottom: 10px;
  line-height: 1.6;
}

.code-block {
  position: relative;
  background: #1a1a1a;
  border-radius: 14px;
  overflow: hidden;
}
.code-pre {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 12px;
  line-height: 1.75;
  color: #e4e4e7;
  padding: 16px 20px;
  overflow-x: auto;
  white-space: pre;
  tab-size: 2;
  margin: 0;
}
.copy-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.1);
  color: #a1a1aa;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}
.copy-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}
.copy-btn.copied {
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.3);
}

.generate-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #ff4f00;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 18px;
  border-radius: 10px;
  transition: opacity 0.15s;
}
.generate-btn:hover {
  opacity: 0.88;
}
.generate-status {
  font-size: 12px;
  color: #71717a;
  margin-left: 12px;
}

.url-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  background: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  padding: 8px 14px;
}
.url-label {
  font-size: 12px;
  font-weight: 600;
  color: #a1a1aa;
  white-space: nowrap;
}
.url-input {
  flex: 1;
  border: none;
  outline: none;
  font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
  font-size: 13px;
  color: #111;
  background: transparent;
}
.url-input::placeholder {
  color: #a1a1aa;
}

.endpoint-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.endpoint-card {
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}
.endpoint-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e4e7;
  background: #f0f0f1;
  flex-wrap: wrap;
}
.method-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  background: #dcfce7;
  color: #166534;
  letter-spacing: 0.04em;
}
.endpoint-path {
  font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
  font-size: 13px;
  font-weight: 500;
  color: #111;
}
.endpoint-hint {
  color: #a1a1aa;
}
.endpoint-desc {
  font-size: 12px;
  color: #71717a;
  margin-left: auto;
}
.endpoint-body .code-block {
  border-radius: 0;
}

.llm-selectors {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.selector-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.selector-label {
  font-size: 11px;
  font-weight: 600;
  color: #a1a1aa;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.selector-tabs {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}
.selector-btn {
  font-size: 12px;
  font-weight: 500;
  padding: 5px 12px;
  background: #f0f0f1;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  color: #71717a;
  transition: all 0.15s;
}
.selector-btn:hover {
  border-color: #c4c4c7;
  color: #111;
}
.selector-btn.active {
  background: rgba(255, 79, 0, 0.09);
  border-color: #ff4f00;
  color: #ff4f00;
  font-weight: 600;
}

.llm-prompt-box {
  width: 100%;
  min-height: 380px;
  font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
  font-size: 12px;
  line-height: 1.75;
  background: #1a1a1a;
  color: #e4e4e7;
  border: none;
  border-radius: 14px;
  padding: 20px;
  resize: vertical;
  outline: none;
  tab-size: 2;
}
.llm-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.copy-prompt-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #ff4f00;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 18px;
  border-radius: 10px;
  transition: opacity 0.15s, background 0.15s;
}
.copy-prompt-btn:hover {
  opacity: 0.88;
}
.copy-prompt-btn.copied {
  background: #16a34a;
}
.llm-hint {
  font-size: 12px;
  color: #a1a1aa;
}

.media-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: #f0f0f1;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  font-size: 13px;
  color: #71717a;
  line-height: 1.55;
}
.media-note code {
  font-size: 11px;
}

.divider {
  height: 1px;
  background: #e4e4e7;
  margin: 48px 0;
}

code {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 12px;
  background: #f0f0f1;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  padding: 1px 5px;
}

html {
  scroll-behavior: smooth;
}

@media (max-width: 768px) {
  .page-shell {
    grid-template-columns: 1fr;
  }
  .page-nav {
    display: none;
  }
  .page-content {
    padding: 32px 0 60px;
  }
  .section-body,
  .section-desc {
    padding-left: 0;
  }
}
</style>
