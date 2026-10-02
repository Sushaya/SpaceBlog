import urllib.request
import base64
import os

diagrams = {
    'fig_4_1_architecture': '''graph TD
    subgraph Client_Tier["Client Tier (User Browser)"]
        UI["Responsive HTML5 / CSS3 / Vanilla JS SPA"]
        State["LocalStorage / Auth Token"]
        Fetch["Fetch API / Polling Engine"]
    end

    subgraph Cloud_Deployment["Dual Cloud Deployment Tier"]
        Vercel["Vercel Serverless Platform"]
        Render["Render Persistent Web Service"]
    end

    subgraph Server_Tier["Application Tier (Node.js and Express.js)"]
        Router["Express Router and API Endpoints"]
        AuthMiddleware["JWT Authentication Middleware"]
        UploadMiddleware["Multer Media Upload Engine"]
        Controllers["Module Controllers"]
    end

    subgraph Data_Tier["Data and Storage Tier"]
        SQLite[("SQLite3 Relational DB")]
        MediaStorage["Local / Disk / Uploads Storage"]
    end

    UI --> Fetch
    Fetch -->|HTTPS / REST API| Vercel
    Fetch -->|HTTPS / REST API| Render
    Vercel --> Router
    Render --> Router
    Router --> AuthMiddleware
    AuthMiddleware --> UploadMiddleware
    UploadMiddleware --> Controllers
    Controllers -->|SQL Queries| SQLite
    Controllers -->|File Operations| MediaStorage''',

    'fig_4_2_dfd0': '''graph TD
    Reader["Reader / User"]
    Author["Author / Creator"]
    Admin["Administrator"]
    System(("1.0 BlogSpace Platform System"))

    Reader -->|Registration, Credentials, Comments, DMs, Likes, Follows| System
    System -->|Posts Feed, Profile Data, Notifications, DM History| Reader

    Author -->|Post Content, Cover Images, Media Attachments| System
    System -->|Post Status, Reader Engagement, Interaction Metrics| Author

    Admin -->|User Management, Comment Deletion, Category Config| System
    System -->|System Logs, User Tables, Audit Reports| Admin''',

    'fig_4_3_dfd1': '''graph TD
    User["User / Author / Admin"]

    P1(("1.0 Auth and User Management"))
    P2(("2.0 Post and Media Content"))
    P3(("3.0 Direct Messaging"))
    P4(("4.0 Social and Follow Engine"))
    P5(("5.0 Admin and Audit Moderation"))

    D1[("D1: users")]
    D2[("D2: posts")]
    D3[("D3: direct_messages")]
    D4[("D4: follows")]
    D5[("D5: comments / likes")]

    User -->|Login / Register| P1
    P1 <--> D1

    User -->|Create / Edit Post| P2
    P2 <--> D2
    P2 --> D1

    User -->|Send DMs / Attachments| P3
    P3 <--> D3
    P3 --> D1

    User -->|Follow / Unfollow| P4
    P4 <--> D4

    User -->|Moderate Content / Ban User| P5
    P5 <--> D1
    P5 <--> D2
    P5 <--> D5''',

    'fig_4_4_usecase': '''graph LR
    subgraph BlogSpace_System["BlogSpace Platform"]
        UC1["Register / Login Account"]
        UC2["Create and Publish Posts"]
        UC3["Upload Media and Avatars"]
        UC4["Send Direct Messages with Files"]
        UC5["Like, Comment and Bookmark Posts"]
        UC6["Follow and Unfollow Users"]
        UC7["Manage Users and Moderate Content"]
        UC8["View System Audit Logs"]
    end

    Reader["Reader"]
    Author["Author"]
    Admin["Administrator"]

    Reader --> UC1
    Reader --> UC5
    Reader --> UC6
    Reader --> UC4

    Author --> UC1
    Author --> UC2
    Author --> UC3
    Author --> UC4
    Author --> UC5
    Author --> UC6

    Admin --> UC1
    Admin --> UC7
    Admin --> UC8''',

    'fig_4_5_seq_login': '''sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as Express Server (/api/auth)
    participant Auth as Bcrypt and JWT Engine
    participant DB as SQLite3 Database

    User->>API: POST /api/auth/login (email, password)
    API->>DB: SELECT * FROM users WHERE email = ?
    DB-->>API: Returns user row (hashed_password)
    API->>Auth: bcrypt.compare(password, hashed_password)
    alt Password Match Success
        Auth-->>API: Verification Passed (True)
        API->>Auth: jwt.sign({ id, role, username }, JWT_SECRET)
        Auth-->>API: Returns JWT Token
        API-->>User: HTTP 200 OK { token, user }
    else Password Match Failed
        Auth-->>API: Verification Failed (False)
        API-->>User: HTTP 401 Unauthorized { error }
    end''',

    'fig_4_6_seq_msg': '''sequenceDiagram
    autonumber
    actor Sender as Sender Browser
    actor Receiver as Receiver Browser
    participant API as Express Server (/api/messages)
    participant Auth as JWT Auth Middleware
    participant Multer as Multer Storage Middleware
    participant DB as SQLite3 Database

    Sender->>API: POST /api/messages (FormData: receiver_id, message, file)
    API->>Auth: Verify Authorization Header (Bearer JWT)
    Auth-->>API: User authenticated (sender_id)
    API->>Multer: Process file upload
    Multer-->>API: Saved attachment to /uploads/file-123.jpg
    API->>DB: INSERT INTO direct_messages
    DB-->>API: Insert Success (message_id)
    API-->>Sender: HTTP 201 Created { message_id, timestamp, attachment_url }
    
    loop Real-time Polling (Every 3 seconds)
        Receiver->>API: GET /api/messages/conversation/:userId
        API->>DB: SELECT * FROM direct_messages
        DB-->>API: Return new message rows
        API-->>Receiver: HTTP 200 OK [ new_messages ]
    end''',

    'fig_4_7_class': '''classDiagram
    class User {
        +INTEGER id
        +VARCHAR username
        +VARCHAR email
        +VARCHAR password_hash
        +VARCHAR role
        +VARCHAR avatar_url
        +TIMESTAMP created_at
        +register()
        +login()
        +updateProfile()
    }

    class Post {
        +INTEGER id
        +INTEGER author_id
        +VARCHAR title
        +TEXT content
        +VARCHAR category
        +VARCHAR cover_image
        +TIMESTAMP created_at
        +createPost()
        +updatePost()
        +deletePost()
    }

    class Comment {
        +INTEGER id
        +INTEGER post_id
        +INTEGER user_id
        +TEXT comment_text
        +TIMESTAMP created_at
        +addComment()
        +deleteComment()
    }

    class DirectMessage {
        +INTEGER id
        +INTEGER sender_id
        +INTEGER receiver_id
        +TEXT content
        +VARCHAR attachment_url
        +BOOLEAN is_read
        +TIMESTAMP created_at
        +sendMessage()
        +fetchConversation()
    }

    class Follower {
        +INTEGER follower_id
        +INTEGER following_id
        +TIMESTAMP created_at
        +followUser()
        +unfollowUser()
    }

    class Category {
        +INTEGER id
        +VARCHAR name
        +VARCHAR description
    }

    User "1" -- "*" Post : writes
    User "1" -- "*" Comment : posts
    Post "1" -- "*" Comment : contains
    User "1" -- "*" DirectMessage : sends
    User "1" -- "*" DirectMessage : receives
    User "*" -- "*" Follower : follows
    Category "1" -- "*" Post : classifies''',

    'fig_4_8_deployment': '''graph TD
    Client["User Browser / Client"]

    subgraph Vercel_Platform["Vercel Serverless Edge Cloud"]
        VercelCDN["Vercel Global Edge CDN"]
        ServerlessFunc["Serverless Lambda Node Function (/api)"]
        TmpDB[("SQLite DB Copy (/tmp/blogspace.db)")]
    end

    subgraph Render_Platform["Render Cloud Web Service"]
        RenderLB["Render Load Balancer"]
        NodeContainer["Node.js Express App Container"]
        PersistentDisk[("Persistent Disk DB and /uploads")]
    end

    Client -->|DNS Resolution / HTTPS| VercelCDN
    Client -->|Alternative HTTPS Endpoint| RenderLB

    VercelCDN --> ServerlessFunc
    ServerlessFunc <--> TmpDB

    RenderLB --> NodeContainer
    NodeContainer <--> PersistentDisk''',

    'fig_4_9_activity_msg': '''stateDiagram-v2
    [*] --> SelectUser
    SelectUser --> ComposeMessage : Open Chat Box
    ComposeMessage --> CheckAttachment : Write Text
    
    state CheckAttachment <<choice>>
    CheckAttachment --> UploadFile : Attachment Selected
    CheckAttachment --> SubmitPayload : No Attachment

    UploadFile --> ValidateFile : Check File Type and Size
    
    state ValidateFile <<choice>>
    ValidateFile --> DisplayError : Exceeds Size Limit (>5MB)
    ValidateFile --> SubmitPayload : Valid Image / Video / PDF

    DisplayError --> ComposeMessage : Fix Attachment
    SubmitPayload --> SendAPIRequest : POST /api/messages
    SendAPIRequest --> StoreDatabase : Insert Record into SQLite3
    StoreDatabase --> RenderUI : Update Chat Window
    RenderUI --> [*]''',

    'fig_4_10_flowchart_login': '''flowchart TD
    Start([User Opens Login Page]) --> Credentials[Enter Email and Password]
    Credentials --> ClickSubmit[Click Sign In Button]
    ClickSubmit --> SendPOST[Send POST /api/auth/login]
    SendPOST --> FetchUser{User Exists in SQLite?}
    
    FetchUser -- No --> Err404[Display User Not Found]
    Err404 --> Credentials
    
    FetchUser -- Yes --> HashCheck{Compare Bcrypt Hash}
    HashCheck -- No Match --> Err401[Display Invalid Password]
    Err401 --> Credentials

    HashCheck -- Match --> GenerateJWT[Generate Signed JWT Token]
    GenerateJWT --> StoreToken[Save JWT in LocalStorage]
    StoreToken --> RedirectDashboard[Redirect to Feed / Dashboard]
    RedirectDashboard --> End([User Authenticated Session])''',

    'fig_4_11_gantt': '''gantt
    title BlogSpace Project Development Lifecycle
    dateFormat  YYYY-MM-DD
    section Phase 1 Planning and SRS
    Requirement Analysis     :done, 2026-06-01, 14d
    SRS Documentation        :done, 2026-06-15, 10d
    section Phase 2 Design
    Database and ER Design   :done, 2026-06-25, 12d
    UML Diagrams and DFDs    :done, 2026-07-07, 14d
    section Phase 3 Implementation
    SQLite Schema and DB Init:done, 2026-07-21, 10d
    Express API Integration  :done, 2026-07-31, 20d
    HTML5 CSS3 JS UI Frontend:done, 2026-08-20, 25d
    Direct Messages Engine   :done, 2026-09-14, 10d
    section Phase 4 Deployment
    Vercel Serverless Config :done, 2026-09-24, 4d
    Render Deployment and Test:done, 2026-09-28, 3d
    Final Report Verification:done, 2026-09-30, 2d''',

    'fig_4_12_er': '''erDiagram
    USERS ||--o{ POSTS : "writes"
    USERS ||--o{ COMMENTS : "creates"
    USERS ||--o{ DIRECT_MESSAGES : "sends"
    USERS ||--o{ DIRECT_MESSAGES : "receives"
    USERS ||--o{ FOLLOWS : "follows"
    USERS ||--o{ FOLLOWS : "is_followed"
    CATEGORIES ||--o{ POSTS : "categorizes"
    POSTS ||--o{ COMMENTS : "contains"

    USERS {
        INTEGER id PK
        VARCHAR username
        VARCHAR email
        VARCHAR password_hash
        VARCHAR role
        VARCHAR avatar_url
        TIMESTAMP created_at
    }

    POSTS {
        INTEGER id PK
        INTEGER author_id FK
        VARCHAR title
        TEXT content
        VARCHAR category
        VARCHAR cover_image
        TIMESTAMP created_at
    }

    COMMENTS {
        INTEGER id PK
        INTEGER post_id FK
        INTEGER user_id FK
        TEXT comment_text
        TIMESTAMP created_at
    }

    DIRECT_MESSAGES {
        INTEGER id PK
        INTEGER sender_id FK
        INTEGER receiver_id FK
        TEXT content
        VARCHAR attachment_url
        BOOLEAN is_read
        TIMESTAMP created_at
    }

    FOLLOWS {
        INTEGER follower_id FK
        INTEGER following_id FK
        TIMESTAMP created_at
    }

    CATEGORIES {
        INTEGER id PK
        VARCHAR name
        VARCHAR description
    }'''
}

out_dir = r'C:\Users\ACER\.gemini\antigravity\scratch\blogspace\diagrams'
os.makedirs(out_dir, exist_ok=True)

for name, code in diagrams.items():
    encoded = base64.b64encode(code.encode('utf-8')).decode('ascii')
    url = f'https://mermaid.ink/img/{encoded}'
    out_path = os.path.join(out_dir, f'{name}.png')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            with open(out_path, 'wb') as f:
                f.write(data)
            print(f'SUCCESS: {name}.png ({len(data)} bytes)')
    except Exception as e:
        print(f'ERROR fetching {name}: {e}')
