// Anything with "null" requires a translation. Contribute to translation via a PR!
const TRANSLATIONS = {
  onboarding: {
    home: {
      getStarted: "はじめる",
      welcome: "ようこそ",
    },
    userSetup: {
      title: "ユーザー設定",
      description: "ユーザー設定を構成します。",
      adminUsername: "管理者アカウントのユーザー名",
      adminEmail: "管理者アカウントのメールアドレス",
      adminPassword: "管理者アカウントのパスワード",
      adminPasswordReq: "パスワードは8文字以上である必要があります。",
      teamHint:
        "デフォルトでは、あなたが唯一の管理者になります。オンボーディングが完了した後、他のユーザーや管理者を作成して招待できます。パスワードを紛失しないでください。管理者のみがパスワードをリセットできます。",
    },
  },
  common: {
    "workspaces-name": "ワークスペース名",
    selection: "モデル選択",
    saving: "保存中...",
    save: "変更を保存",
    previous: "前のページ",
    next: "次のページ",
    optional: "任意",
    search: "検索",
    username_requirements:
      "ユーザー名は2〜64文字で、小文字で始まり、小文字、数字、アンダースコア、ハイフン、ピリオドのみを含む必要があります。",
    on: "～について",
    none: "なし",
    stopped: "停止",
    loading: "読み込み中",
    refresh: "リフレッシュ",
    delete: "削除",
  },
  settings: {
    title: "インスタンス設定",
    invites: "招待",
    users: "ユーザー",
    roles: "Roles & Permissions",
    workspaces: "ワークスペース",
    "workspace-chats": "ワークスペースチャット",
    customization: "カスタマイズ",
    "api-keys": "開発者API",
    llm: "LLM",
    transcription: "文字起こし",
    embedder: "埋め込みエンジン",
    "text-splitting": "テキスト分割とチャンク化",
    "voice-speech": "音声とスピーチ",
    "vector-database": "ベクターデータベース",
    embeds: "チャット埋め込み",
    "event-logs": "イベントログ",
    privacy: "プライバシーとデータ",
    "ai-providers": "AIプロバイダー",
    "agent-skills": "エージェントスキル",
    "agent-flow": "エージェントフロー",
    "sql-connector": "SQLコネクタ",
    "agent-skills-setting": "設定",
    "default-system-prompt": "デフォルトシステムプロンプト",
    "instance-owner": "インスタンス所有者",
    admin: "管理者",
    tools: "ツール",
    "system-prompt-variables": "システムプロンプト変数",
    "slash-commands": "Slash Commands",
    "experimental-features": "実験的機能",
    contact: "サポートに連絡",
    "browser-extension": "ブラウザ拡張",
    smtp: "SMTP",
    interface: "UI設定",
    branding: "ブランディングとホワイトレーベル化",
    chat: "チャット",
    "mobile-app": "NexusAI モバイル版",
    "community-hub": {
      title: "地域交流拠点",
      trending: "人気のあるものを探す",
      "your-account": "あなたのアカウント",
      "import-item": "輸入品",
    },
    channels: "チャンネル",
    "available-channels": {
      telegram: "テレグラム",
      line: "LINE",
    },
    "scheduled-jobs": "計画された作業",
    "model-router": "モデルルーター",
    "image-generation": "画像生成",
  },
  login: {
    form: {
      welcome: "ようこそ",
      "placeholder-username": "ユーザー名",
      "placeholder-password": "パスワード",
      login: "ログイン",
      validating: "検証中...",
      "forgot-pass": "パスワードを忘れた",
      reset: "リセット",
    },
    "sign-in": "{{appName}} アカウントにサインインします。",
    "password-reset": {
      title: "パスワードリセット",
      "admin-reset-description":
        "管理者にパスワードのリセットを依頼してください。管理者が新しいパスワードを発行し、次回ログイン時にご自身でパスワードを設定していただきます。",
      "back-to-login": "ログイン画面に戻る",
    },
  },
  "new-workspace": {
    title: "新しいワークスペース",
    placeholder: "マイワークスペース",
  },
  "workspaces—settings": {
    general: "一般設定",
    chat: "チャット設定",
    vector: "ベクターデータベース",
    members: "メンバー",
    agent: "エージェント構成",
    "upload-documents": "ドキュメントをアップロード",
  },
  general: {
    vector: {
      title: "ベクター数",
      description: "ベクターデータベース内のベクターの総数。",
    },
    names: {
      description: "これはワークスペースの表示名のみを変更します。",
    },
    message: {
      title: "提案されたチャットメッセージ",
      description:
        "ワークスペースユーザーに提案されるメッセージをカスタマイズします。",
      add: "新しいメッセージを追加",
      save: "メッセージを保存",
      heading: "説明してください",
      body: "NexusAIの利点",
    },
    status: {
      title: "ワークスペースのステータス",
      description:
        "非アクティブなワークスペースはドキュメント、チャット、メンバーをすべて保持しますが、誰もチャットできなくなり、そこを参照している埋め込みも応答を停止します。",
      active: "アクティブ",
      inactive: "非アクティブ",
      deactivate: "非アクティブにする",
      activated: "ワークスペースはアクティブになりました。",
      deactivated: "ワークスペースは非アクティブになりました。",
      "chat-disabled":
        "このワークスペースは非アクティブです。ここでチャットするには管理者がアクティブにする必要があります。",
      "chat-not-a-member":
        "このワークスペースを管理できますが、チャットはメンバーのみに限られています。ここで会話を始めるには、自分をメンバーとして追加してください。",
      failed: "ワークスペースのステータスを更新できませんでした。",
      "confirm-title": "このワークスペースを非アクティブにしますか？",
      "confirm-description":
        "再度アクティブにするまで、メンバーはこのワークスペースでチャットできなくなります。データは削除されません。",
    },
    delete: {
      title: "ワークスペースを削除",
      description:
        "このワークスペースとそのすべてのデータを削除します。これにより、すべてのユーザーのワークスペースが削除されます。",
      delete: "ワークスペースを削除",
      deleting: "ワークスペースを削除中...",
      "confirm-start": "ワークスペース全体を削除しようとしています",
      "confirm-end":
        "ワークスペース。この操作により、ベクターデータベース内のすべてのベクター埋め込みが削除されます。\n\n元のソースファイルはそのまま残ります。この操作は元に戻せません。",
    },
  },
  chat: {
    llm: {
      title: "ワークスペースLLMプロバイダー",
      description:
        "このワークスペースで使用するLLMプロバイダーとモデルを指定します。デフォルトではシステムのLLMプロバイダーと設定が使用されます。",
      search: "すべてのLLMプロバイダーを検索",
    },
    model: {
      title: "ワークスペースチャットモデル",
      description:
        "このワークスペースで使用するチャットモデルを指定します。空の場合はシステムのLLM設定が使用されます。",
    },
    mode: {
      title: "チャットモード",
      chat: {
        title: "チャット",
        description:
          "LLMの一般的な知識と、関連するドキュメントの文脈に基づいて、回答を提供します。ツールを使用するには、`@agent`コマンドを使用する必要があります。",
      },
      query: {
        title: "クエリ",
        description:
          "必要な情報が見つかった場合にのみ、回答を提供します。ツールを使用するには、`@agent`コマンドを使用する必要があります。",
      },
      automatic: {
        description:
          "ネイティブなツール呼び出しをサポートしている場合、モデルとプロバイダーが自動的にツールを使用します。ネイティブなツール呼び出しがサポートされていない場合は、@agentコマンドを使用してツールを使用する必要があります。",
        title: "代理人",
      },
    },
    history: {
      title: "チャット履歴",
      "desc-start": "応答の短期記憶に含まれる過去のチャット数。",
      recommend: "推奨値: 20",
    },
    prompt: {
      title: "プロンプト",
      description:
        "このワークスペースで使用するプロンプトです。AIが適切な応答を生成できるよう、コンテキストや指示を定義してください。",
      history: {
        title: "システムプロンプトの履歴",
        clearAll: "クリアすべて",
        noHistory: "利用履歴は保存されていません。",
        restore: "復元",
        delete: "削除",
        deleteConfirm: "本当にこの履歴項目を削除してもよろしいですか？",
        clearAllConfirm:
          "本当に履歴をすべて削除したくないですか？ この操作は取り消すことができません。",
        expand: "拡大",
        publish: "コミュニティハブに公開する",
      },
    },
    refusal: {
      title: "クエリモード拒否応答",
      "desc-start": "モードが",
      query: "クエリ",
      "desc-end":
        "の場合、コンテキストが見つからないときにカスタム拒否応答を返すことができます。",
      "tooltip-title": "なぜ、私はこれを見ているのだろう？",
      "tooltip-description":
        "現在、クエリモードで、お客様のドキュメントからのみ情報を取得しています。より柔軟な会話をご希望の場合は、チャットモードに切り替えてください。チャットモードについて詳しく知りたい場合は、こちらをクリックして、当社のドキュメントをご覧ください。",
    },
    temperature: {
      title: "LLM温度",
      "desc-end":
        "数値が高いほど創造的になりますが、高すぎると一部のモデルでは一貫性のない応答になる場合があります。",
    },
  },
  "vector-workspace": {
    identifier: "ベクターデータベース識別子",
    snippets: {
      title: "最大コンテキストスニペット数",
      description:
        "この設定は、チャットやクエリごとにLLMへ送信される最大コンテキストスニペット数を制御します。",
      recommend: "推奨値: 4",
    },
    doc: {
      title: "ドキュメント類似度しきい値",
      description:
        "チャットに関連すると見なされるために必要な最小類似度スコアです。数値が高いほど、より類似したソースのみが対象となります。",
      zero: "制限なし",
      low: "低（類似度スコア ≥ 0.25）",
      medium: "中（類似度スコア ≥ 0.50）",
      high: "高（類似度スコア ≥ 0.75）",
    },
    reset: {
      reset: "ベクターデータベースをリセット",
      resetting: "ベクターをクリア中...",
      confirm:
        "このワークスペースのベクターデータベースをリセットしようとしています。これにより、現在埋め込まれているすべてのベクターが削除されます。\n\n元のソースファイルはそのまま残ります。この操作は元に戻せません。",
      error: "ワークスペースのベクターデータベースをリセットできませんでした！",
      success: "ワークスペースのベクターデータベースがリセットされました！",
    },
  },
  agent: {
    "performance-warning":
      "ツール呼び出しに対応していないLLMの性能は、モデルの能力や精度に大きく依存します。一部の機能が制限されたり、正しく動作しない場合があります。",
    provider: {
      title: "ワークスペースエージェントのLLMプロバイダー",
      description:
        "このワークスペースの@agentで使用するLLMプロバイダーとモデルを指定します。",
    },
    mode: {
      chat: {
        title: "ワークスペースエージェントのチャットモデル",
        description:
          "このワークスペースの@agentで使用するチャットモデルを指定します。",
      },
      title: "ワークスペースエージェントのモデル",
      description:
        "このワークスペースの@agentで使用するLLMモデルを指定します。",
      wait: "-- モデルを読み込み中 --",
    },
    skill: {
      rag: {
        title: "RAGと長期記憶",
        description:
          "エージェントがローカルドキュメントを活用して質問に答えたり、内容を「記憶」して長期的に参照できるようにします。",
      },
      view: {
        title: "ドキュメントの閲覧と要約",
        description:
          "エージェントがワークスペース内のファイルを一覧表示し、内容を要約できるようにします。",
      },
      scrape: {
        title: "ウェブサイトの取得",
        description:
          "エージェントがウェブサイトを訪問し、内容を取得できるようにします。",
      },
      generate: {
        title: "チャートの生成",
        description:
          "デフォルトエージェントがチャットやデータからさまざまなチャートを作成できるようにします。",
      },
      web: {
        title: "ウェブ検索と閲覧",
        description:
          "エージェントがウェブ検索（SERP）プロバイダーに接続することで、あなたの質問に答えるためにウェブを検索できるようにする。",
      },
      sql: {
        title: "SQLコネクタ",
        description:
          "エージェントが、さまざまなSQLデータベースプロバイダーに接続することで、SQLを活用してお客様からの質問に回答できるようにする。",
      },
      default_skill:
        "デフォルトでは、この機能は有効になっていますが、エージェントに利用させたくない場合は、無効にすることができます。",
      filesystem: {
        title: "ファイルシステムのアクセス",
        description:
          "エージェントが、指定されたディレクトリ内のファイルを読む、書き、検索、および管理できるようにします。ファイル編集、ディレクトリのナビゲーション、およびコンテンツ検索をサポートします。",
        learnMore: "このスキルの使い方について、さらに詳しく知る",
        configuration: "設定",
        readActions: "行動",
        writeActions: "行動",
        warning:
          "ファイルシステムへのアクセスは危険であり、ファイルの内容を変更または削除する可能性があります。設定する前に、必ず<a>のドキュメント</a>を参照してください。",
        skills: {
          "read-text-file": {
            title: "ファイルを開く",
            description:
              "ファイル（テキスト、コード、PDF、画像など）の内容を読み込む。",
          },
          "read-multiple-files": {
            title: "複数のファイルを読み込む",
            description: "複数のファイルを同時に読み込む",
          },
          "list-directory": {
            title: "ディレクトリ一覧",
            description: "フォルダ内のファイルとディレクトリの一覧を表示する",
          },
          "search-files": {
            title: "ファイル検索",
            description: "ファイル名または内容で検索する",
          },
          "get-file-info": {
            title: "ファイルの情報を取得する",
            description: "ファイルに関する詳細なメタデータを取得する",
          },
          "edit-file": {
            title: "ファイル編集",
            description: "テキストファイルの行単位での編集を行う",
          },
          "create-directory": {
            title: "ディレクトリを作成する",
            description: "新しいディレクトリを作成する",
          },
          "move-file": {
            title: "ファイル/ファイル名の変更",
            description: "ファイルやディレクトリを移動または名前を変更する",
          },
          "copy-file": {
            title: "ファイルのコピー",
            description: "ファイルとディレクトリをコピーする",
          },
          "write-text-file": {
            title: "テキストファイルを作成する",
            description:
              "新しいテキストファイルを作成するか、既存のテキストファイルを上書きする。",
          },
        },
      },
      createFiles: {
        title: "ドキュメント作成",
        description:
          "エージェントが、パワーポイント、Excel、Word、PDFなどのバイナリ形式のドキュメントを作成できるようにします。ファイルはチャットウィンドウから直接ダウンロードできます。",
        configuration: "利用可能なドキュメントの種類",
        skills: {
          "create-text-file": {
            title: "テキストファイル",
            description:
              ".txt、.md、.json、.csvなどの拡張子を持つ、任意のコンテンツのテキストファイルを作成する。",
          },
          "create-pptx": {
            title: "パワーポイント形式のプレゼンテーション",
            description:
              "スライド、タイトル、箇条書きを含む、新しいPowerPointプレゼンテーションを作成する。",
          },
          "create-pdf": {
            title: "PDFドキュメント",
            description:
              "マークダウンまたはプレーンテキストから、基本的な書式設定を使用してPDFドキュメントを作成する。",
          },
          "create-xlsx": {
            title: "エクセル スプレッドシート",
            description:
              "表形式のデータをスプレッドシート形式で作成し、シートとスタイルを設定する。",
          },
          "create-docx": {
            title: "Wordドキュメント",
            description: "基本的なスタイルと書式でWordドキュメントを作成する",
          },
        },
      },
      gmail: {
        title: "Gmail 接続",
        description:
          "エージェントがGmailと連携できるようにする：メールの検索、スレッドの閲覧、ドラフトの作成、メールの送信、およびインボックスの管理を可能にします。詳細については、<a>ドキュメントを参照</a>。",
        configuration: "Gmail の設定",
        deploymentId: "デプロイメントID",
        deploymentIdHelp:
          "あなたのGoogle Apps ScriptウェブアプリケーションのデプロイメントID",
        apiKey: "APIキー",
        apiKeyHelp: "Google Apps Script のデプロイ時に設定した API キー",
        configurationRequired:
          "Gmail の機能を有効にするには、デプロイメント ID と API キーを設定してください。",
        configured: "設定済み",
        searchSkills: "検索スキル...",
        noSkillsFound: "検索条件に合致するスキルは見つかりませんでした。",
        categories: {
          search: {
            title: "メールの検索と閲覧",
            description: "Gmail の受信トレイから、メールを検索および閲覧する",
          },
          drafts: {
            title: "サンプルメール",
            description: "メールの作成、編集、および管理",
          },
          send: {
            title: "メールの送信と返信",
            description: "メールを送信し、スレッドへの返信をすぐに行う。",
          },
          threads: {
            title: "メールのトピックを管理する",
            description:
              "メールのトピックを管理する - 既読/未読のマーク、アーカイブ、削除",
          },
          account: {
            title: "統合に関する統計",
            description: "メールボックスの統計情報とアカウント情報を表示する",
          },
        },
        skills: {
          search: {
            title: "メールを検索する",
            description: "Gmail のクエリ構文を使用して、メールを検索する",
          },
          readThread: {
            title: "スレッドを読む",
            description: "IDでメールの全文を閲覧する",
          },
          createDraft: {
            title: "ドラフト作成",
            description: "新しいメールの草案を作成する",
          },
          createDraftReply: {
            title: "草案の返信を作成する",
            description: "既存のスレッドに対する返信の草案を作成する",
          },
          updateDraft: {
            title: "ドラフトの更新",
            description: "既存のメールドラフトを更新する",
          },
          getDraft: {
            title: "草案を入手",
            description: "IDで特定のドラフトを取得する",
          },
          listDrafts: {
            title: "ドラフト案リスト",
            description: "すべての草案メールの一覧を表示する",
          },
          deleteDraft: {
            title: "草案を削除",
            description: "草案のメールを削除する",
          },
          sendDraft: {
            title: "草案を送信",
            description: "既存のメールドラフトを送信する",
          },
          sendEmail: {
            title: "メールを送信する",
            description: "すぐにメールを送信してください",
          },
          replyToThread: {
            title: "スレッドへの返信",
            description: "メールのやり取りにすぐに返信する",
          },
          markRead: {
            title: "マーク・リード",
            description: "スレッドを「読了」としてマークする",
          },
          markUnread: {
            title: "未読としてマーク",
            description: "スレッドを「未読」としてマークする",
          },
          moveToTrash: {
            title: "ゴミ箱へ移動",
            description: "スレッドをゴミ箱に移動する",
          },
          moveToArchive: {
            title: "アーカイブ",
            description: "スレッドをアーカイブする",
          },
          moveToInbox: {
            title: "受信トレイへ移動",
            description: "スレッドをインボックスに移動する",
          },
          getMailboxStats: {
            title: "メールボックスの統計情報",
            description: "未読件数とメールボックスの統計情報を取得する",
          },
          getInbox: {
            title: "インボックスを開く",
            description: "Gmail から受信したメールを効率的に取得する方法",
          },
        },
      },
      outlook: {
        title: "Outlook 連携機能",
        description:
          "エージェントがMicrosoft Outlookと連携できるようにする - Microsoft Graph APIを使用して、メールの検索、スレッドの閲覧、ドラフトの作成、メールの送信、およびインボックスの管理を行う。詳細については、ドキュメントを参照してください。",
        configuration: "Outlook の設定",
        authType: "アカウントの種類",
        authTypeHelp:
          "認証に使用できるMicrosoftアカウントの種類を選択します。「すべて」は、個人用アカウントと職場/学校用アカウントの両方をサポートします。「個人用のみ」は、個人用Microsoftアカウントに限定されます。「職場/学校用のみ」は、特定のAzure ADテナントからの職場/学校用アカウントに限定されます。",
        authTypeCommon: "すべての口座（個人用および仕事/学校用）",
        authTypeConsumers: "個人のMicrosoftアカウントのみ",
        authTypeOrganization: "組織アカウントのみ（テナントIDが必要です）",
        clientId: "アプリケーション（クライアント）ID",
        clientIdHelp:
          "あなたのAzure ADアプリケーションの「アプリケーション（クライアント）ID」",
        tenantId: "テナントID",
        tenantIdHelp:
          "あなたの Azure AD アプリの登録から取得した「ディレクトリ（テナント）ID」。組織での認証のみに必要です。",
        clientSecret: "クライアントの秘密",
        clientSecretHelp:
          "Azure AD アプリの登録から取得したクライアントのシークレット値",
        configurationRequired:
          "Outlook の機能を有効にするには、クライアント ID とクライアントシークレットを設定してください。",
        authRequired:
          "まず、認証情報を保存し、その後、Microsoftとの認証を行い、設定を完了してください。",
        authenticateWithMicrosoft: "マイクロソフトとの認証",
        authenticated: "Microsoft Outlookとの認証に成功しました。",
        revokeAccess: "アクセス権を停止する",
        configured: "設定済み",
        searchSkills: "検索スキル...",
        noSkillsFound: "検索条件に一致するスキルは見つかりませんでした。",
        categories: {
          search: {
            title: "メールの検索と閲覧",
            description: "Outlook の受信トレイから、メールを検索して読み取る。",
          },
          drafts: {
            title: "サンプルメール",
            description: "メールの作成、編集、および管理",
          },
          send: {
            title: "メールの送信",
            description:
              "新しいメールを送信するか、すぐにメッセージに返信してください。",
          },
          account: {
            title: "統合に関する統計",
            description: "メールボックスの統計情報とアカウント情報を確認する",
          },
        },
        skills: {
          getInbox: {
            title: "受信トレイを開く",
            description: "Outlook の受信トレイから、最近のメールを取得する",
          },
          search: {
            title: "メールを検索する",
            description: "Microsoft の検索構文を使用してメールを検索する",
          },
          readThread: {
            title: "会話の内容を読み取る",
            description: "メールのやり取り全体を読み込む",
          },
          createDraft: {
            title: "ドラフト作成",
            description:
              "新しいメールの草案を作成するか、既存のメッセージへの返信の草案を作成する。",
          },
          updateDraft: {
            title: "ドラフトの更新",
            description: "既存のメールドラフトを更新する",
          },
          listDrafts: {
            title: "ドラフト案リスト",
            description: "すべての草案メールの一覧",
          },
          deleteDraft: {
            title: "草案を削除",
            description: "草案のメールを削除する",
          },
          sendDraft: {
            title: "草案を送信",
            description: "既存のメールの草稿を送信する",
          },
          sendEmail: {
            title: "メールを送信する",
            description:
              "新しいメールを作成するか、既存のメッセージにすぐに返信してください。",
          },
          getMailboxStats: {
            title: "メールボックスの統計",
            description: "フォルダの数とメールボックスの統計情報を取得する",
          },
        },
      },
      googleCalendar: {
        title: "Google カレンダー 連携機能",
        description:
          "エージェントがGoogleカレンダーと連携できるようにする - カレンダーの表示、イベントの取得、イベントの作成と更新、およびRSVPの管理を可能にする。詳細については、ドキュメントを参照してください。",
        configuration: "Google カレンダーの設定",
        deploymentId: "デプロイメントID",
        deploymentIdHelp:
          "あなたのGoogle Apps ScriptのウェブアプリケーションのデプロイID",
        apiKey: "APIキー",
        apiKeyHelp: "Google Apps Script のデプロイ時に設定した API キー",
        configurationRequired:
          "Google カレンダーの機能を使用するために、デプロイメントIDとAPIキーを設定してください。",
        configured: "設定済み",
        searchSkills: "検索スキル...",
        noSkillsFound:
          "あなたの検索条件に合致するスキルは見つかりませんでした。",
        categories: {
          calendars: {
            title: "カレンダー",
            description: "Googleカレンダーの表示と管理",
          },
          readEvents: {
            title: "イベント情報",
            description: "カレンダー上のイベントの表示と検索",
          },
          writeEvents: {
            title: "イベントの作成と更新",
            description: "新しいイベントを作成し、既存のイベントを修正する",
          },
          rsvp: {
            title: "RSVP（出欠確認）管理",
            description: "イベントへの参加状況を管理する",
          },
        },
        skills: {
          listCalendars: {
            title: "カレンダーリスト",
            description:
              "所有している、または購読しているすべてのカレンダーの一覧",
          },
          getCalendar: {
            title: "カレンダーの詳細を確認する",
            description: "特定のカレンダーに関する詳細な情報த்தைப்入手する",
          },
          getEvent: {
            title: "イベント情報を入手",
            description: "特定のイベントに関する詳細な情報த்தைப்入手する",
          },
          getEventsForDay: {
            title: "その日のイベントを検索する",
            description: "特定の日に予定されているすべてのイベントを取得する",
          },
          getEvents: {
            title: "イベント（期間指定）",
            description: "指定した期間内のイベントを取得する",
          },
          getUpcomingEvents: {
            title: "今後のイベントをチェックする",
            description:
              "今日、今週、または今月のイベントを、簡単なキーワードを使って検索する",
          },
          quickAdd: {
            title: "イベントをすぐに登録",
            description:
              "自然言語（例：「明日午後3時に会議」）からイベントを作成する",
          },
          createEvent: {
            title: "イベントを作成する",
            description:
              "すべてのプロパティを完全に制御できる、新しいイベントを作成する。",
          },
          updateEvent: {
            title: "イベント情報更新",
            description: "既存の予定を更新する",
          },
          setMyStatus: {
            title: "返信状況を設定する",
            description: "イベントへの参加、拒否、または仮の参加",
          },
        },
      },
      scheduledJob: {
        title: "計画されたタスクを作成する",
        description:
          "エージェントがチャットから繰り返し実行されるタスク（例：「毎日午前9時に、私のインボックスとメールを要約してメールで通知する」）を作成できるようにします。この機能はシングルユーザーモードでのみ利用可能です。",
      },
    },
    mcp: {
      title: "MCP サーバー",
      "loading-from-config": "構成ファイルからMCPサーバーを読み込む",
      "learn-more": "MCP サーバーに関する詳細情報を入手してください。",
      "no-servers-found": "MCP サーバーは見つかりませんでした",
      "tool-warning":
        "最高のパフォーマンスを得るためには、不要なツールを無効にして、コンテキストを維持することを検討してください。",
      "stop-server": "MCP サーバーの停止",
      "start-server": "MCP サーバーを開始する",
      "delete-server": "MCP サーバーを削除",
      "tool-count-warning":
        "このMCPサーバーには、<b>のツールが有効になっており、これらはチャットのコンテキストを消費します</b>。コンテキストを節約するために、不要なツールを無効にすることを検討してください。",
      "startup-command": "起動コマンド",
      command: "指示",
      arguments: "議論",
      "not-running-warning":
        "このMCPサーバーは稼働していません。停止しているか、起動時にエラーが発生している可能性があります。",
      "tool-call-arguments": "ツール呼び出しの引数",
      "tools-enabled": "ツールが有効化されました",
    },
    settings: {
      title: "エージェントのスキル設定",
      "max-tool-calls": {
        title: "1回の応答で実行できる最大ツール数",
        description:
          "エージェントが単一の応答を生成するために使用できるツールの一意な最大数。これにより、ツール呼び出しの過剰や無限ループを防ぐことができます。",
      },
      "intelligent-skill-selection": {
        title: "知的なスキル選択",
        description:
          "クエリごとに、無制限のツールを使用し、トークン使用量を最大80%削減できます。AnythingLLMは、各プロンプトに対して最適なスキルを自動的に選択します。",
        "max-tools": {
          title: "マックスツールズ",
          description:
            "各クエリで選択できるツール数の上限。大規模なコンテキストモデルを使用する場合は、この値をより高い値に設定することをお勧めします。",
        },
      },
      "clarifying-questions": {
        title:
          "エージェントが、詳細を確認するための質問をしてもらうことを許可する",
        "beta-badge": "β版",
        description:
          "設定が有効になっている場合、エージェントは、指示が曖昧な場合に、簡単な確認のための質問をすることができます。",
        "max-per-turn": {
          title: "1ターンあたりの質問数",
          description:
            "調査において、担当者が尋ねることができる質問の最大数はいくつですか。",
        },
      },
    },
  },
  recorded: {
    title: "ワークスペースチャット履歴",
    description:
      "ユーザーが送信したすべてのチャットとメッセージの履歴です。作成日時順に表示されます。",
    export: "エクスポート",
    table: {
      id: "ID",
      by: "送信者",
      workspace: "ワークスペース",
      prompt: "プロンプト",
      response: "応答",
      feedback: "評価",
      at: "送信日時",
    },
    feedback: {
      up: "役に立ったと評価",
      down: "役に立たなかったと評価",
      none: "評価なし",
      filter_all: "すべての評価",
      filter_up: "役に立ったのみ",
      filter_down: "役に立たなかったのみ",
      filter_none: "未評価のみ",
    },
  },
  api: {
    title: "APIキー",
    description:
      "APIキーにより、プログラム経由でこのAnythingLLMインスタンスにアクセスおよび管理できます。",
    link: "APIドキュメントを読む",
    generate: "新しいAPIキーを生成",
    empty: "APIキーが見つかりません",
    actions: "操作",
    messages: {
      error: "エラー: {{error}}",
    },
    modal: {
      title: "新しいAPIキーを作成",
      cancel: "キャンセル",
      close: "閉じる",
      create: "APIキーを作成",
      helper:
        "作成したAPIキーは、このAnythingLLMインスタンスにプログラムからアクセスして設定するために使用できます。",
      name: {
        label: "名前",
        placeholder: "本番環境の統合",
        helper: "任意です。後でこのキーを識別しやすい名前を付けてください。",
      },
    },
    row: {
      copy: "APIキーをコピー",
      copied: "コピー済み",
      unnamed: "--",
      deleteConfirm:
        "このAPIキーを無効化してもよろしいですか？\n無効化すると、以後このキーは使用できなくなります。\n\nこの操作は元に戻せません。",
    },
    table: {
      name: "名前",
      key: "APIキー",
      by: "作成者",
      created: "作成日",
    },
  },
  llm: {
    title: "LLMの設定",
    description:
      "これは、お好みのLLMチャットおよび埋め込みプロバイダー用の認証情報と設定です。これらのキーが最新かつ正確でない場合、AnythingLLMは正しく動作しません。",
    provider: "LLMプロバイダー",
    providers: {
      azure_openai: {
        azure_service_endpoint: "Azure サービス エンドポイント",
        api_key: "APIキー",
        chat_deployment_name: "チャットデプロイメント名",
        chat_model_token_limit:
          "チャットモデルのトークン制限について\n\nチャットモデルのトークン制限について",
        model_type: "モデルの種類",
        default: "デフォルト",
        reasoning: "理由",
        model_type_tooltip:
          "もし、あなたのシステムが推論モデル（o1、o1-mini、o3-miniなど）を使用している場合、この設定を「推論」に設定してください。そうでない場合、チャットの要求が失敗する可能性があります。",
      },
    },
  },
  transcription: {
    title: "文字起こしモデルの設定",
    description:
      "これは、お好みの文字起こしモデルプロバイダー用の認証情報と設定です。これらのキーが最新かつ正確でない場合、メディアファイルや音声が正しく文字起こしされません。",
    provider: "文字起こしプロバイダー",
    "warn-start":
      "RAMやCPUが限られたマシンでローカルのWhisperモデルを使用すると、メディアファイルの処理中にAnythingLLMが停止する可能性があります。",
    "warn-recommend":
      "少なくとも2GBのRAMが推奨され、ファイルサイズは10Mb未満であることをお勧めします。",
    "warn-end": "組み込みモデルは初回使用時に自動的にダウンロードされます。",
  },
  embedding: {
    title: "埋め込み設定",
    "desc-start":
      "LLMがネイティブに埋め込みエンジンをサポートしていない場合、テキストの埋め込み用に追加の認証情報を指定する必要がある場合があります。",
    "desc-end":
      "埋め込みとは、テキストをベクトルに変換するプロセスです。これらの認証情報は、ファイルやプロンプトをAnythingLLMが処理できるフォーマットに変換するために必要です。",
    provider: {
      title: "埋め込みプロバイダー",
    },
  },
  text: {
    title: "テキスト分割とチャンク化の設定",
    "desc-start":
      "新しいドキュメントがベクトルデータベースに挿入される前に、どのように分割およびチャンク化されるかのデフォルトの方法を変更する場合があります。",
    "desc-end":
      "テキスト分割の仕組みとその副作用を理解している場合にのみ、この設定を変更するべきです。",
    size: {
      title: "テキストチャンクサイズ",
      description: "1つのベクトルに含まれる最大の文字数です。",
      recommend: "埋め込みモデルの最大長は",
    },
    overlap: {
      title: "テキストチャンクの重複",
      description: "隣接するテキストチャンク間に発生する最大の重複文字数です。",
    },
  },
  vector: {
    title: "ベクターデータベース設定",
    description:
      "これは、AnythingLLMインスタンスの動作方法用の認証情報と設定です。これらのキーが最新で正確であることが重要です。",
    provider: {
      title: "ベクターデータベースプロバイダー",
      description: "LanceDBの場合、特に設定は必要ありません。",
    },
  },
  embeddable: {
    title: "埋め込みチャットウィジェット",
    description:
      "埋め込みチャットウィジェットは、特定のワークスペースに紐付けられた公開用チャットインターフェースです。これにより、ワークスペースを構築し、そのチャットを外部に公開できます。",
    create: "埋め込みチャットウィジェットを作成",
    table: {
      workspace: "ワークスペース",
      chats: "送信済みチャット",
      active: "有効なドメイン",
      created: "作成",
    },
  },
  "embed-chats": {
    title: "埋め込みチャット履歴",
    export: "エクスポート",
    description:
      "これは、公開された埋め込みウィジェットから送信された全てのチャットとメッセージの記録です。",
    table: {
      embed: "埋め込み",
      sender: "送信者",
      message: "メッセージ",
      response: "応答",
      at: "送信日時",
    },
  },
  event: {
    title: "イベントログ",
    description:
      "監視のために、このインスタンスで発生しているすべてのアクションとイベントを表示します。",
    clear: "イベントログをクリア",
    table: {
      type: "イベントタイプ",
      user: "ユーザー",
      occurred: "発生日時",
    },
  },
  privacy: {
    title: "プライバシーとデータ処理",
    description:
      "これは、接続されているサードパーティプロバイダーとAnythingLLMがデータをどのように処理するかの設定です。",
    anonymous: "匿名テレメトリが有効",
    personalization: {
      label: "パーソナライズと記憶を有効にする",
      auto_label: "記憶の自動抽出を有効にする",
      description:
        "アシスタントがユーザーやワークスペースに関する事実を記憶し、以降の会話で利用できるようにします。これはインスタンス全体のポリシーです。無効にすると全員がこの機能を利用できなくなります。各ユーザーはチャットの記憶パネルで記憶されるかどうかを選択でき、記憶がユーザー間で共有されることはありません。自動抽出は、アクティブなユーザーとワークスペースごとにLLM呼び出しのコストがかかるバックグラウンドジョブを実行します。",
    },
  },
  connectors: {
    "search-placeholder": "データコネクタを検索",
    "no-connectors": "データコネクタが見つかりません。",
    github: {
      name: "GitHubリポジトリ",
      description:
        "ワンクリックで公開・非公開のGitHubリポジトリ全体をインポートできます。",
      URL: "GitHubリポジトリURL",
      URL_explained: "収集したいGitHubリポジトリのURLです。",
      token: "GitHubアクセストークン",
      optional: "任意",
      token_explained: "レート制限を回避するためのアクセストークンです。",
      token_explained_start: "アクセストークンがない場合、",
      token_explained_link1: "パーソナルアクセストークン",
      token_explained_middle:
        "がないと、GitHub APIのレート制限により収集できるファイル数が制限される場合があります。 ",
      token_explained_link2: "一時的なアクセストークンを作成",
      token_explained_end: "してこの問題を回避できます。",
      ignores: "無視するファイル",
      git_ignore:
        ".gitignore形式で収集時に無視したいファイルをリストしてください。エンターキーで各エントリを保存します。",
      task_explained:
        "完了後、すべてのファイルがドキュメントピッカーからワークスペースに埋め込めるようになります。",
      branch: "収集したいブランチ",
      branch_loading: "-- 利用可能なブランチを読み込み中 --",
      branch_explained: "収集したいブランチを指定します。",
      token_information:
        "<b>GitHubアクセストークン</b>を入力しない場合、GitHubの公開APIのレート制限により<b>トップレベル</b>のファイルのみ収集可能です。",
      token_personal:
        "無料のパーソナルアクセストークンはこちらから取得できます。",
    },
    gitlab: {
      name: "GitLabリポジトリ",
      description:
        "ワンクリックで公開・非公開のGitLabリポジトリ全体をインポートできます。",
      URL: "GitLabリポジトリURL",
      URL_explained: "収集したいGitLabリポジトリのURLです。",
      token: "GitLabアクセストークン",
      optional: "任意",
      token_description: "GitLab APIから取得する追加エンティティを選択します。",
      token_explained_start: "アクセストークンがない場合、",
      token_explained_link1: "パーソナルアクセストークン",
      token_explained_middle:
        "がないと、GitLab APIのレート制限により収集できるファイル数が制限される場合があります。 ",
      token_explained_link2: "一時的なアクセストークンを作成",
      token_explained_end: "してこの問題を回避できます。",
      fetch_issues: "Issueをドキュメントとして取得",
      ignores: "無視するファイル",
      git_ignore:
        ".gitignore形式で収集時に無視したいファイルをリストしてください。エンターキーで各エントリを保存します。",
      task_explained:
        "完了後、すべてのファイルがドキュメントピッカーからワークスペースに埋め込めるようになります。",
      branch: "収集したいブランチ",
      branch_loading: "-- 利用可能なブランチを読み込み中 --",
      branch_explained: "収集したいブランチを指定します。",
      token_information:
        "<b>GitLabアクセストークン</b>を入力しない場合、GitLabの公開APIのレート制限により<b>トップレベル</b>のファイルのみ収集可能です。",
      token_personal:
        "無料のパーソナルアクセストークンはこちらから取得できます。",
    },
    youtube: {
      name: "YouTube文字起こし",
      description: "YouTube動画の文字起こしをリンクからインポートできます。",
      URL: "YouTube動画URL",
      URL_explained_start:
        "文字起こしを取得したいYouTube動画のURLを入力してください。動画には",
      URL_explained_link: "クローズドキャプション",
      URL_explained_end: "が必要です。",
      task_explained:
        "完了後、文字起こしがドキュメントピッカーからワークスペースに埋め込めるようになります。",
    },
    "website-depth": {
      name: "ウェブサイト一括スクレイパー",
      description: "ウェブサイトとその下層リンクを指定した深さまで取得します。",
      URL: "ウェブサイトURL",
      URL_explained: "取得したいウェブサイトのURLです。",
      depth: "クロール深度",
      depth_explained: "元のURLからたどる子リンクの数です。",
      max_pages: "最大ページ数",
      max_pages_explained: "取得する最大リンク数です。",
      task_explained:
        "完了後、すべての取得内容がドキュメントピッカーからワークスペースに埋め込めるようになります。",
    },
    confluence: {
      name: "Confluence",
      description: "ワンクリックでConfluenceページ全体をインポートできます。",
      deployment_type: "Confluenceデプロイタイプ",
      deployment_type_explained:
        "ConfluenceインスタンスがAtlassianクラウドかセルフホストかを選択します。",
      base_url: "ConfluenceベースURL",
      base_url_explained: "ConfluenceスペースのベースURLです。",
      space_key: "Confluenceスペースキー",
      space_key_explained:
        "使用するConfluenceインスタンスのスペースキーです。通常は~で始まります。",
      username: "Confluenceユーザー名",
      username_explained: "Confluenceのユーザー名です。",
      auth_type: "Confluence認証タイプ",
      auth_type_explained:
        "Confluenceページへアクセスするための認証タイプを選択してください。",
      auth_type_username: "ユーザー名とアクセストークン",
      auth_type_personal: "パーソナルアクセストークン",
      token: "Confluenceアクセストークン",
      token_explained_start:
        "認証用のアクセストークンを入力してください。アクセストークンは",
      token_explained_link: "こちら",
      token_desc: "認証用アクセストークン",
      pat_token: "Confluenceパーソナルアクセストークン",
      pat_token_explained: "Confluenceのパーソナルアクセストークンです。",
      task_explained:
        "完了後、ページ内容がドキュメントピッカーからワークスペースに埋め込めるようになります。",
      bypass_ssl: "SSL証明書の検証をスキップする",
      bypass_ssl_explained:
        "これにより、独自の証明書で署名された、自社ホストのConfluenceインスタンスに対して、SSL証明書の検証を回避できます。",
    },
    manage: {
      documents: "ドキュメント",
      "data-connectors": "データコネクタ",
      "desktop-only":
        "これらの設定の編集はデスクトップ端末のみ対応しています。デスクトップでこのページにアクセスしてください。",
      dismiss: "閉じる",
      editing: "編集中",
    },
    directory: {
      "my-documents": "マイドキュメント",
      "new-folder": "新しいフォルダー",
      visibility: {
        label: "このフォルダーを見られる人",
        private: "自分のみ",
        "private-description":
          "他のユーザーにはこのフォルダーもその中のファイルも表示されません。",
        workspace: "このワークスペース",
        "workspace-description":
          "このワークスペースのメンバー全員が閲覧できます。",
        shared: "全員",
        "shared-description":
          "ドキュメントライブラリにアクセスできる全員が閲覧できます。",
      },
      "default-folder": "共有アップロード",
      "my-folder": "自分のアップロード",
      "rename-folder": "フォルダー名を変更",
      "change-visibility": "公開範囲を変更",
      "search-document": "ドキュメントを検索",
      "no-documents": "ドキュメントがありません",
      "move-workspace": "ワークスペースへ移動",
      "delete-confirmation-files":
        "これらのファイルを削除してもよろしいですか？\nシステムおよび既存のワークスペースから自動的に削除されます。\nこの操作は元に戻せません。",
      "delete-confirmation":
        "これらのファイルやフォルダーを削除してもよろしいですか？\nシステムから削除され、既存のワークスペースからも自動的に削除されます。\nこの操作は元に戻せません。",
      "removing-message-files": "{{count}} 件のドキュメントを削除中です。お待ちください。",
      "removing-message":
        "{{count}}件のドキュメントと{{folderCount}}件のフォルダーを削除中です。しばらくお待ちください。",
      "move-success": "{{count}}件のドキュメントを移動しました。",
      no_docs: "ドキュメントがありません",
      select_all: "すべて選択",
      deselect_all: "すべて選択解除",
      remove_selected: "選択したものを削除",
      save_embed: "保存して埋め込む",
      "total-documents_one": "{{count}} のドキュメント",
      "total-documents_other": "{{count}} に関する書類",
      "search-results_one": "{{count}} の結果",
      "search-results_other": "{{count}} の結果",
    },
    upload: {
      "processor-offline": "ドキュメント処理機能が利用できません",
      "processor-offline-desc":
        "ドキュメント処理機能がオフラインのため、ファイルをアップロードできません。後でもう一度お試しください。",
      "click-upload":
        "クリックしてアップロード、またはドラッグ＆ドロップしてください",
      "upload-files": "アップロード",
      "upload-into": "{{folder}} にアップロード",
      "drop-here":
        "フォルダーにドロップするとそこへ、ここにドロップすると {{folder}} へアップロードします",
      "file-types":
        "テキストファイル、CSV、スプレッドシート、音声ファイルなどに対応しています！",
      "or-submit-link": "またはリンクを入力",
      "placeholder-link": "https://example.com",
      fetching: "取得中...",
      "fetch-website": "ウェブサイトを取得",
      "privacy-notice":
        "これらのファイルは、このAnythingLLMインスタンス上のドキュメント処理機能にアップロードされます。第三者に送信・共有されることはありません。",
    },
    pinning: {
      what_pinning: "ドキュメントのピン留めとは？",
      pin_explained_block1:
        "AnythingLLMでドキュメントを<b>ピン留め</b>すると、その内容全体がプロンプトウィンドウに挿入され、LLMがしっかり理解できるようになります。",
      pin_explained_block2:
        "<b>大きなコンテキストを持つモデル</b>や、重要な小さなファイルで特に効果的です。",
      pin_explained_block3:
        "デフォルトのままでは満足できる回答が得られない場合、ピン留めを活用するとより高品質な回答が得られます。",
      accept: "わかりました",
    },
    watching: {
      what_watching: "ドキュメントのウォッチとは？",
      watch_explained_block1:
        "AnythingLLMでドキュメントを<b>ウォッチ</b>すると、元のソースから定期的に内容が<i>自動的に</i>同期されます。管理しているすべてのワークスペースで内容が自動更新されます。",
      watch_explained_block2:
        "この機能は現在オンラインベースのコンテンツのみ対応しており、手動アップロードしたドキュメントには利用できません。",
      watch_explained_block3_start: "ウォッチしているドキュメントの管理は",
      watch_explained_block3_link: "ファイルマネージャー",
      watch_explained_block3_end: "管理画面から行えます。",
      accept: "わかりました",
    },
    obsidian: {
      vault_location: "保管場所",
      vault_description:
        "Obsidianの vault フォルダを選択して、すべてのメモとそれらの関連をインポートします。",
      selected_files: "マークダウン形式のファイルが見つかりました：{{count}}個",
      importing: "保管庫のインポート...",
      import_vault: "Import Vault",
      processing_time:
        "これは、保管場所のサイズによって時間がかかる可能性があります。",
      vault_warning:
        "いかなる紛争を避けるため、Obsidianの保管場所が現在開いている状態でないことを確認してください。",
    },
    gitea: {
      name: "ギテアのリポジトリ",
      description:
        "Gitea の任意のインスタンスから、公開またはプライベートなリポジトリ全体を 1 つのクリックでインポートします。",
      URL: "ギテアのリポジトリURL",
      URL_explained:
        "収集したいリポジトリのGiteaインスタンス上のURL – 自社ホストのリポジトリもサポートされています。",
      token: "ギテア アクセス トークン",
      optional: "（オプション）",
      token_explained:
        "プライベートリポジトリや、認証が必要なインスタンス上のリポジトリを取得するには、アクセストークンが必要です。",
      token_explained_start: "～なしで",
      token_explained_link1: "アクセス トークン",
      token_explained_end:
        "ただし、Gitea インスタンスが公開しているリポジトリのみを収集できます。",
      ignores: "ファイルは無視する",
      git_ignore:
        "`.gitignore`形式で、収集時に特定のファイルを無視するためのリストを作成します。保存したい項目ごとにEnterキーを押してください。",
      task_explained:
        "すべてのファイルが完了すると、ドキュメントピッカーを使用してワークスペースに埋め込むことができます。",
      branch: "ファイルを収集したいブランチを指定してください。",
      branch_loading: "— 利用可能なブランチのロード中 —",
      branch_explained: "ファイルを収集したいブランチの名前。",
      token_information:
        "<b>Giteaアクセストークン</b>を入力しない場合、このデータコネクタは、あなたのGiteaインスタンス上の公開で読み取り可能なリポジトリからのみファイルを収集できます。",
    },
  },
  chat_window: {
    agent_exit_hint: "Type /exit to exit agent execution loop early.",
    send_message: "メッセージを送信",
    attach_file: "このチャットにファイルを添付",
    text_size: "テキストサイズを変更",
    microphone: "プロンプトを音声入力",
    send: "ワークスペースにプロンプトメッセージを送信",
    attachments_processing:
      "添付ファイルの処理中です。しばらくお待ちください。",
    response_streaming:
      "次のメッセージを送信する前に、現在の返答が完了するまでお待ちください。",
    tts_speak_message: "TTS Speak メッセージ",
    copy: "以下に翻訳を示します。",
    regenerate: "再生",
    regenerate_response: "申し訳ありませんが、その質問にはお答えできません。",
    good_response: "良い反応",
    bad_response: "良くない回答",
    feedback_reason_title: "どこが問題でしたか?",
    feedback_reason_placeholder: "この回答の問題点を教えてください (任意)",
    feedback_reason_skip: "スキップ",
    feedback_reason_submit: "フィードバックを送信",
    more_actions:
      "さらに詳細な情報が必要な場合は、お気軽にお問い合わせください。",
    fork: "フォーク",
    delete: "削除",
    cancel: "キャンセル",
    edit_prompt: "編集のヒント",
    edit_response: "編集内容を保存します。",
    preset_reset_description:
      "チャット履歴をクリアし、新しいチャットを開始してください。",
    add_new_preset: "新しいプリセットを追加する",
    command: "命令",
    your_command: "あなたの指示",
    placeholder_prompt: "これは、プロンプトの先頭に挿入されるコンテンツです。",
    description: "説明",
    placeholder_description: "大規模言語モデルに関する詩を提示します。",
    save: "保存",
    small: "小さい",
    normal: "通常",
    large: "大規模",
    submit: "送信",
    edit_info_user:
      "「送信」はAIの応答を再生成します。「保存」は、あなたのメッセージのみを更新します。",
    edit_info_assistant: "あなたの変更は、この回答に直接保存されます。",
    see_less: "詳細を見る",
    see_more: "詳細を見る",
    tools: "道具",
    text_size_label: "文字サイズ",
    sources: "出典",
    document: "文書",
    database_source: "データベース",
    mcp_source: "MCP ツール",
    similarity_match: "試合",
    source_count_one: "{{count}} 参照",
    source_count_other: "{{count}} への参照",
    stop_generating: "応答の生成を停止する",
    slash_commands: "スラッシュコマンド",
    agents: "利用可能なエージェント",
    at_agent: "@agent",
    default_agent_description:
      " - このワークスペースのデフォルトエージェントです。ウェブ検索やサイトのスクレイピングなどが行えます。",
    start_agent_session: "エージェントセッションを開始",
    agent_invocation: {
      model_wants_to_call: "モデルは電話をかけたい。",
      approve: "承認",
      reject: "拒否",
      always_allow: "常に、{{skillName}}を確保してください。",
      tool_call_was_approved: "ツールの使用許可が承認されました",
      tool_call_was_rejected: "ツール呼び出しは拒否されました",
      clarifying_skip: "エージェントに判断を委ねる",
      clarifying_submit: "送信",
      clarifying_skipped: "その決定は、エージェントに委ねます。",
      clarifying_timeout: "指定された時間内に回答が提出されなかった。",
      clarifying_pagination: "{{current}} は、{{total}} の",
      clarifying_prev_aria: "前の質問",
      clarifying_next_aria: "次の質問",
      clarifying_close_aria: "閉じる、スキップ",
      clarifying_other: "その他",
      clarifying_other_placeholder: "回答を入力してください",
      batch_progress: "{{answered}} は、{{total}} の質問に回答",
      batch_skip_this: "スキップ",
      batch_submit_all: "すべてを提出",
      batch_next: "次",
      answer_skipped: "[ユーザーがこの項目をスキップしました]",
    },
    memories: {
      title: "思い出",
      empty:
        "現時点では、記憶はまだありません。チャットボットとのやり取りを続けると、徐々に記憶が埋まっていくでしょう。",
      empty_cta: "新しい記憶を作成する",
      tab_workspace: "作業スペース",
      tab_global: "世界的な",
      toggle: {
        label: "パーソナライズ機能を有効にする",
        description:
          "アシスタントに、あなたやこの作業スペースに関する情報を思い出させ、会話の中で活用してもらうようにしましょう。",
      },
      auto_extraction: {
        label: "自動生成された思い出",
        description:
          "アシスタントに、バックグラウンドで自動的に思い出を作成させるように設定してください。",
      },
      scope_hint:
        "これらの設定はご自身のアカウントにのみ適用されます。あなたの記憶が他のユーザーと共有されることはありません。",
      menu: {
        edit: "編集",
        delete: "削除",
        move_to_global: "グローバルへ",
        move_to_workspace: "ワークスペースへ移動",
      },
      modal: {
        create_title: "記憶を創造する",
        edit_title: "メモリの編集",
        create_description:
          "記憶は、簡潔で一文で表現されるべきです。例：「ユーザーはPythonをJavaScriptよりも好む」",
        edit_description: "この記憶の内容を更新してください。",
        label: "記憶",
        placeholder:
          "例：ユーザー名がジョー、ユーザーが使用しているツールがAnythingLLMなど。",
        create: "作成する",
        save: "保存",
        cancel: "キャンセル",
      },
    },
    stt_unsupported:
      "このブラウザではマイクへのアクセスはサポートされていません。",
    stt_mic_denied:
      "マイクへのアクセスができません。「許可を付与して、再度お試しください。」",
    stt_transcription_failed: "文字起こしに失敗しました: {{error}}",
    export: "チャットを以下のような形式でエクスポートする：",
    exporting: "輸出…",
    preset_img_description: "テキストプロンプトから画像を生成する。",
  },
  profile_settings: {
    edit_account: "アカウントを編集",
    profile_picture: "プロフィール画像",
    remove_profile_picture: "プロフィール画像を削除",
    username: "ユーザー名",
    email: "メールアドレス",
    password: "パスワード",
    password_description: "パスワードは8文字以上である必要があります",
    cancel: "キャンセル",
    update_account: "アカウントを更新",
    theme: "テーマ設定",
    language: "優先言語",
    failed_upload: "プロフィール写真のアップロードに失敗しました：{{error}}",
    upload_success: "プロフィール写真がアップロードされました。",
    failed_remove: "プロフィール写真の削除に失敗しました：{{error}}",
    profile_updated: "プロフィールを更新しました。",
    failed_update_user: "ユーザーの更新に失敗：{{error}}",
    account: "アカウント",
    support: "サポート",
    signout: "ログアウト",
    speech: {
      title: "音声",
    },
    connections: {
      title: "連携アプリ",
      status_connected: "連携済み",
      status_disconnected: "未連携",
      status_unavailable: "未設定",
    },
    telegram: {
      title: "Telegram",
      unavailable:
        "このインスタンスにはまだ Telegram ボットが接続されていません。管理者に設定を依頼してください。",
      description:
        "このインスタンスのボットを使って、Telegram からワークスペースとチャットできます。",
      connect: "接続",
      connected_chat: "接続済みのチャット",
      connected_description:
        "ボットはこのチャットであなたとして、あなたのワークスペースに応答します。",
      disconnect: "接続を解除",
      disconnected: "Telegram の接続を解除しました。",
      disconnect_failed: "Telegram の接続解除に失敗しました。",
      send_this: "Telegram で {{bot}} に次を送信してください:",
      the_bot: "ボット",
      copy: "コマンドをコピー",
      copy_failed: "クリップボードにコピーできませんでした。",
      expires_in: "残り {{seconds}} 秒で期限切れ",
      open_bot: "ボットを開く",
      scan_hint: "スキャンして Telegram でボットを開く",
      status_connected: "連携済み",
      status_disconnected: "未連携",
      code_failed: "連携コードを生成できませんでした。",
    },
    line: {
      title: "LINE",
      unavailable:
        "このインスタンスにはまだ LINE ボットが接続されていません。管理者に設定を依頼してください。",
      description:
        "このインスタンスのボットを使って、LINE からワークスペースとチャットできます。",
      connect: "接続",
      connected_chat: "接続済みのチャット",
      connected_description:
        "ボットはこのチャットであなたとして、あなたのワークスペースに応答します。",
      disconnect: "接続を解除",
      disconnected: "LINE の接続を解除しました。",
      disconnect_failed: "LINE の接続解除に失敗しました。",
      send_this: "LINE で {{bot}} に次を送信してください:",
      the_bot: "ボット",
      copy: "コマンドをコピー",
      copy_failed: "クリップボードにコピーできませんでした。",
      expires_in: "残り {{seconds}} 秒で期限切れ",
      open_bot: "ボットを開く",
      scan_hint: "スキャンして LINE でボットを友だち追加",
      scan_or_search: "スキャンして追加、または LINE で {{basicId}} を検索",
      status_connected: "連携済み",
      status_disconnected: "未連携",
      code_failed: "連携コードを生成できませんでした。",
    },
  },
  customization: {
    interface: {
      title: "UI設定",
      description: "NexusAI の UI 設定を調整してください。",
    },
    branding: {
      title: "ブランディングとホワイトレーベル化",
      description:
        "AnythingLLMインスタンスを、独自のブランドでカスタマイズしてください。",
    },
    chat: {
      title: "チャット",
      description: "NexusAI のチャット設定をカスタマイズしてください。",
      auto_submit: {
        title: "自動音声入力送信",
        description: "沈黙の後に自動で音声入力を行う",
      },
      auto_speak: {
        title: "自動応答機能",
        description: "AIによる自動応答",
      },
      spellcheck: {
        title: "スペルチェック機能を有効にする",
        description:
          "チャット入力フィールドでのスペルチェックを有効または無効にする",
      },
    },
    items: {
      theme: {
        title: "テーマ",
        description: "アプリケーションの希望の色テーマを選択してください。",
      },
      "show-scrollbar": {
        title: "スクロールバーを表示する",
        description:
          "チャットウィンドウのスクロールバーを有効または無効にする。",
      },
      "support-email": {
        title: "サポートメール",
        description:
          "ユーザーが支援を必要とする際に利用できる、サポート用メールアドレスを設定します。",
      },
      "app-name": {
        title: "名前",
        description:
          "ログインページに表示される名前を、すべてのユーザーに設定する。",
      },
      "display-language": {
        title: "表示言語",
        description:
          "AnythingLLMのUIを特定の言語で表示するためのオプションを選択してください。翻訳が利用可能な場合にのみ有効です。",
      },
      logo: {
        title: "ブランドロゴ",
        description:
          "すべてのページで表示するためのカスタムロゴをアップロードしてください。",
        add: "カスタムロゴを追加する",
        recommended: "推奨サイズ：800 x 200",
        remove: "削除",
        replace: "置き換える",
      },
      "browser-appearance": {
        title: "ブラウザの見た目",
        description:
          "アプリを開いたときに、ブラウザのタブとタイトルをカスタマイズする。",
        tab: {
          title: "タイトル",
          description:
            "ブラウザでアプリを開いたときに、カスタムのタブタイトルを設定します。",
        },
        favicon: {
          title: "Favicon",
          description: "ブラウザのタブにカスタムのfaviconを使用する。",
        },
      },
      "sidebar-footer": {
        title: "サイドバーのフッター項目",
        description:
          "サイドバーの下部に表示されるフッターの項目をカスタマイズする。",
        icon: "アイコン",
        link: "リンク",
      },
      "render-html": {
        title: "チャットでHTMLをレンダリングする",
        description:
          "アシスタントの回答にHTML形式のレスポンスを生成する。\nこれにより、回答の品質を大幅に向上させることができるが、同時にセキュリティ上のリスクも生じる可能性がある。",
      },
      "disable-auto-scroll": {
        title: "自動スクロール機能を無効にする",
        description:
          "新しいメッセージを受信した際に、チャットを自動的に最後までスクロールする機能を停止します。",
      },
    },
  },
  "main-page": {
    quickActions: {
      createAgent: "エージェントを作成する",
      editWorkspace: "ワークスペースの編集",
      uploadDocument: "ドキュメントをアップロードする",
    },
    greeting: "今日はどのようにお手伝いできますか？",
  },
  password_change: {
    title: "パスワードの変更",
    current_password: "現在のパスワード",
    new_password: "新しいパスワード",
    confirm_password: "新しいパスワードの確認",
    password_requirements: "パスワードは8文字以上である必要があります",
    mismatch: "新しいパスワードが一致しません。",
    success: "パスワードを変更しました。",
    updating: "更新中...",
    cancel: "キャンセル",
    page_description: "アカウントの新しいパスワードを選択してください。",
    forced_title: "新しいパスワードを設定",
    forced_description:
      "パスワードは管理者によって発行されました。続行するにはご自身のパスワードを設定してください。",
    forced_submit: "パスワードを設定して続行",
    sign_out: "代わりにログアウトする",
  },
  "keyboard-shortcuts": {
    title: "キーボードショートカット",
    shortcuts: {
      settings: "設定を開く",
      workspaceSettings: "現在のワークスペースの設定を開く",
      home: "ホームページへ",
      workspaces: "ワークスペースの管理",
      apiKeys: "APIキーの設定",
      llmPreferences: "LLM の好み",
      chatSettings: "チャット設定",
      help: "キーボードショートカットのヘルプを表示する",
    },
  },
  community_hub: {
    publish: {
      system_prompt: {
        success_title: "成功！",
        success_description:
          "システムプロンプトがコミュニティハブに公開されました。",
        success_thank_you: "コミュニティへの共有ありがとうございます。",
        view_on_hub: "コミュニティハブでの表示",
        modal_title: "出版システムに関するプロンプト",
        name_label: "名前",
        name_description: "これは、システムのプロンプトの名前です。",
        name_placeholder: "私のシステムプロンプト",
        description_label: "説明",
        description_description:
          "これは、システムプロンプトの説明です。システムプロンプトの目的を説明するために使用してください。",
        tags_label: "タグ",
        tags_description:
          "タグは、システムプロンプトを簡単に検索できるようにラベル付けするために使用されます。複数のタグを追加できます。最大5つのタグ。各タグは最大20文字です。",
        tags_placeholder:
          "タグを追加するには、タイプしてEnterキーを押してください。",
        visibility_label: "視界",
        public_description:
          "一般のシステムからのメッセージは、すべての人に表示されます。",
        private_description:
          "プライベートなシステムからのメッセージは、あなただけが見ることができます。",
        publish_button: "コミュニティハブに公開する",
        submitting: "出版...",
        prompt_label: "プロンプト",
        prompt_description:
          "これは、大規模言語モデル（LLM）を誘導するために使用される実際のシステムプロンプトです。",
        prompt_placeholder: "ここにシステムプロンプトを入力してください...",
      },
      agent_flow: {
        success_title: "成功！",
        success_description:
          "あなたのエージェントフローがコミュニティハブに公開されました。",
        success_thank_you: "コミュニティへの共有ありがとうございます。",
        view_on_hub: "コミュニティハブで確認",
        modal_title: "出版代理店フロー",
        name_label:
          "山田太郎\n\n\n氏名\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n\n名前\n山田 太郎\n<|im",
        name_description: "これは、あなたのエージェントフローの名前です。",
        name_placeholder: "私のエージェントフロー",
        description_label: "説明",
        description_description:
          "これは、あなたのエージェントフローの説明です。この説明文を使って、あなたのエージェントフローの目的を記述してください。",
        tags_label: "タグ",
        tags_description:
          "タグは、ワークフローをより簡単に検索するために使用されます。複数のタグを追加できます。最大5つのタグ。各タグは最大20文字です。",
        tags_placeholder:
          "タグを追加するには、タイプしてEnterキーを押してください。",
        visibility_label: "視界",
        submitting: "出版...",
        submit: "コミュニティハブに公開する",
        privacy_note:
          "機密性の高いデータ保護のため、ワークフローは常にプライベートでアップロードされます。公開後、コミュニティハブで可視性を変更できます。公開前に、ワークフローに機密情報や個人情報が含まれていないことを確認してください。",
      },
      generic: {
        unauthenticated: {
          title: "本人確認が必要です。",
          description:
            "アイテムを公開する前に、AnythingLLMコミュニティハブで認証する必要があります。",
          button: "コミュニティハブへの接続",
        },
      },
      slash_command: {
        success_title: "成功！",
        success_description:
          "スラッシュコマンドがコミュニティハブに公開されました。",
        success_thank_you: "コミュニティへの共有ありがとうございます。",
        view_on_hub: "コミュニティハブでの表示",
        modal_title: "スラッシュコマンドを公開する",
        name_label: "名前",
        name_description: "これは、スラッシュコマンドの名前です。",
        name_placeholder: "私のスラッシュコマンド",
        description_label: "説明",
        description_description:
          "これは、スラッシュコマンドの説明です。スラッシュコマンドの目的を記述するために使用してください。",
        tags_label: "タグ",
        tags_description:
          "スラッシュコマンドをより簡単に検索できるように、タグを使用してコマンドを分類します。複数のタグを追加できます。最大5つのタグ。各タグは最大20文字です。",
        tags_placeholder:
          "タグを追加するには、タイプしてEnterキーを押してください。",
        visibility_label: "視界",
        public_description:
          "一般のユーザーが利用できるコマンドは、すべての人に公開されています。",
        private_description:
          "私だけが利用できるプライベートなスラッシュコマンドのみが表示されます。",
        publish_button: "コミュニティハブに公開する",
        submitting: "出版...",
        prompt_label:
          "どのような状況で、どのような目的で、どのような方法で、どのような結果を期待していますか？",
        prompt_description:
          "これは、スラッシュコマンドが実行されたときに使用されるプロンプトです。",
        prompt_placeholder: "ここに指示を入力してください...",
      },
    },
  },
  home: {
    welcome: "ようこそ",
    chooseWorkspace: "ワークスペースを選択してチャットを開始してください！",
    noWorkspaces:
      "You don't have any workspaces yet.\nCreate one to start chatting.",
    notAssigned:
      "現在、あなたはどのワークスペースにも割り当てられていません。\nワークスペースへのアクセスを要求するには、管理者にお問い合わせください。",
    goToWorkspace: 'ワークスペースに移動 "{{workspace}}"',
  },
  telegram: {
    title: "テレグラムボット",
    description:
      "AnyLLM のインスタンスを Telegram に接続します。1 つのボットを全員で共有し、各自が自分のアカウントを連携して自分のワークスペースだけにアクセスします。",
    setup: {
      step1: {
        title: "ステップ1：Telegramボットを作成する",
        description:
          "Telegramの@BotFatherを開き、「/newbot」と入力して<code>@BotFather</code>に送信します。指示に従い、APIトークンをコピーしてください。",
        "open-botfather": "BotFather を起動する",
        "instruction-1": "1. リンクを開くか、QRコードをスキャンする",
        "instruction-2":
          "2. 「<code>」/「newbot」を「</code>」で、「<code>」@「BotFather」に送信してください。",
        "instruction-3": "3. 独自の名前とユーザー名をボットに設定してください",
        "instruction-4": "4. 受け取ったAPIトークンをコピーしてください",
      },
      step2: {
        title: "ステップ2：ボットとの接続",
        description:
          "@BotFatherから受け取ったAPIトークンを貼り付け、ボットとのチャットに使用するデフォルトのワークスペースを選択してください。",
        "bot-token": "ボット トークン",
        connecting: "接続中...",
        "connect-bot": "コネクトボット",
      },
      security: {
        title: "推奨されるセキュリティ設定",
        description:
          "追加のセキュリティのため、@BotFatherでこれらの設定を設定してください。",
        "disable-groups": "— グループへのボットの追加を防止",
        "disable-inline": "— インライン検索でのボットの使用を防止",
        "obscure-username":
          "目立たないユーザー名をbotに使用することで、発見されにくくする。",
      },
      "toast-enter-token": "ボットのトークンを入力してください。",
      "toast-connect-failed": "ボットとの接続に失敗しました。",
    },
    connected: {
      status: "接続されている",
      "status-disconnected":
        "通信エラー - トークンが無効または期限切れになっている可能性があります",
      "smtp-warning":
        "SMTPが設定されていないため、確認コードをメールで送信できません - アカウントをリンクできるユーザーがいなくなります。設定 > SMTP から設定してください。",
      "placeholder-token": "新しいボットのトークンを貼り付け...",
      reconnect: "再接続",
      workspace: "作業スペース",
      "bot-link": "ボットへのリンク",
      "voice-response": "音声応答",
      disconnecting: "接続を解除...",
      disconnect: "接続を解除する",
      "voice-text-only": "テキストのみ",
      "voice-mirror": "（ユーザーが音声で送信した場合、音声で返信）",
      "voice-always": "常に音声メッセージ（返信ごとに音声データを送信）",
      "toast-disconnect-failed": "ボットとの接続を解除できませんでした。",
      "toast-reconnect-failed": "ボットとの再接続に失敗しました。",
      "toast-voice-failed": "音声モードの更新に失敗しました。",
      "linked-accounts": "連携済みアカウント",
      "per-user-note":
        "各自がプロフィール設定から自分のアカウントを連携し、自分の権限で自分のワークスペースとチャットします。",
    },
    users: {
      title: "連携済みアカウント",
      description:
        "このインスタンスのアカウントに紐づいた Telegram チャットです。ボットは各チャットにそのアカウントとして応答します。",
      empty: "まだ誰も Telegram チャットを連携していません。",
      "no-workspace": "ワークスペース未選択",
      disconnect: "接続を解除",
      "toast-unlink-failed": "そのチャットの接続解除に失敗しました。",
      "toast-unlinked": "チャットの接続を解除しました。",
      unknown: "不明",
    },
  },
  scheduledJobs: {
    title: "予定されている作業",
    enableNotifications: "求人情報の通知をブラウザで許可する",
    description:
      "定期的に実行されるAIタスクを作成します。これらのタスクは、指定されたスケジュールに従って実行され、オプションのツールを使用してプロンプトを実行し、結果を保存してレビューします。",
    newJob: "新しい仕事",
    loading: "読み込み中...",
    emptyTitle: "現時点で予定されている作業はありません。",
    emptySubtitle: "まずは、簡単なものから始めてみましょう。",
    table: {
      name: "名前",
      schedule: "スケジュール",
      status: "ステータス",
      lastRun: "最後の走行",
      nextRun: "次回の開催",
      actions: "行動",
    },
    confirmDelete: "本当にこの予定された作業を削除してもよろしいですか？",
    toast: {
      deleted: "求人情報が削除されました",
      triggered: "ジョブが正常に実行されました",
      triggerFailed: "ジョブの実行が失敗しました",
      triggerSkipped: "この仕事については、すでに作業が進んでいます。",
      killed: "作業は正常に終了しました",
      killFailed: "仕事をやめることができなかった",
    },
    row: {
      neverRun: "絶対に走らない",
      viewRuns: "実行例",
      runNow: "今すぐ行動を",
      enable: "有効にする",
      disable: "無効化",
      edit: "編集",
      delete: "削除",
    },
    modal: {
      titleEdit: "予定されたタスクの編集",
      titleNew: "新規スケジュールされた作業",
      nameLabel: "名前",
      namePlaceholder: "例：デイリーニュースダイジェスト",
      promptLabel: "指示",
      promptPlaceholder: "「各実行時に実行する」という指示...",
      scheduleLabel: "スケジュール",
      modeBuilder: "建設業者",
      modeCustom: "オーダーメイド",
      cronPlaceholder: "Cron 形式の指定 (例: 0 9 * * *)",
      currentSchedule: "現在のスケジュール：",
      toolsLabel: "道具（任意）",
      toolsDescription:
        "このタスクで使用できるエージェントツールを選択してください。 ツールが選択されていない場合、タスクはツールなしで実行されます。",
      toolsSearch: "検索",
      needsSetup: "このスキルは使用前に設定が必要です",
      needsSetupLabel: "設定が必要",
      toolsNoResults: "該当するツールは見つかりませんでした。",
      required: "必要",
      requiredFieldsBanner:
        "求人を作成するには、必要なすべての項目を記入してください。",
      cancel: "キャンセル",
      saving: "保存中...",
      updateJob: "求人情報の更新",
      createJob: "求人を作成する",
      jobUpdated: "求人情報が更新されました",
      jobCreated: "雇用が創出された",
    },
    builder: {
      fallbackWarning:
        "このテキストは、視覚的に編集することはできません。元のテキストを維持するには、「カスタム」モードに切り替えてください。または、以下の項目を変更することで、このテキストを上書きできます。",
      run: "走る",
      frequency: {
        minute: "1分ごとに",
        hour: "時間ごと",
        day: "毎日",
        week: "毎週",
        month: "毎月",
      },
      every: "すべて",
      minuteOne: "1分",
      minuteOther: "{{count}} 分",
      atMinute: "分単位で",
      pastEveryHour: "過去の、1時間ごとに",
      at: "～に",
      on: "～について",
      onDay: "ある日",
      ofEveryMonth: "毎月",
      weekdays: {
        sun: "太陽",
        mon: "月",
        tue: "火曜日",
        wed: "水曜日",
        thu: "木曜日",
        fri: "金曜日",
        sat: "土曜日",
      },
    },
    runHistory: {
      back: "求人情報に戻る",
      title: "実行履歴: {{name}}",
      schedule: "スケジュール：",
      emptyTitle: "現時点では、この仕事に対してまだ成果は出ていません。",
      emptySubtitle: "現在ジョブを実行し、その結果を確認してください。",
      runNow: "今すぐ実行",
      table: {
        status: "ステータス",
        started: "開始",
        duration: "期間",
        error: "エラー",
      },
      stopJob: "仕事の停止",
    },
    runDetail: {
      loading: "ロード実行の詳細を読み込んでいます...",
      notFound: "指定されたプログラムが見つかりませんでした。",
      back: "背面",
      unknownJob: "不明な職種",
      runHeading: "{{name}} — 実行: #{{id}}",
      duration: "期間: {{value}}",
      creating: "作成中...",
      threadFailed: "スレッドの作成に失敗しました",
      sections: {
        prompt: "指示",
        error: "エラー",
        thinking: "考え ({{count}})",
        toolCalls: "ツール呼び出し ({{count}})",
        files: "ファイル ({{count}})",
        response: "返答",
        metrics: "指標",
      },
      metrics: {
        promptTokens: "プロンプトトークン:",
        completionTokens: "完了トークン：",
      },
      stopJob: "求人停止",
      killing: "停止…",
      continueInThread: "チャットを続ける",
    },
    toolCall: {
      arguments: "主張：",
      showResult: "結果を表示",
      hideResult: "結果を非表示にする",
    },
    file: {
      unknown: "不明なファイル",
      download: "ダウンロード",
      downloadFailed: "ファイルのダウンロードに失敗しました",
      types: {
        powerpoint: "パワーポイント",
        pdf: "PDFドキュメント",
        word: "Wordドキュメント",
        spreadsheet: "スプレッドシート",
        generic: "ファイル",
      },
    },
    status: {
      completed: "完了",
      failed: "失敗",
      timed_out: "時間切れ",
      running: "ランニング",
      queued: "待ち列",
    },
  },
  "model-router": {
    title: "モデルルーター",
    description:
      "モデルルーターを使用すると、特定の条件に基づいて、チャットメッセージを異なるLLMプロバイダーやモデルに自動的にルーティングするためのルールを定義できます。",
    table: {
      name: "名前",
      fallback: "代替案",
      rules: "ルール",
      workspaces: "作業スペース",
    },
    "no-routers": "現時点では、特定のモデルのルーターはまだありません。",
    "empty-description":
      "現時点では、設定されたルーターはありません。設定を開始するために、一つ作成してください。",
    "new-router-button": "新しいルーター",
    "delete-confirm":
      "ルーター「{{name}}」を削除してもよろしいですか？\nこれにより、すべての設定と、それを使用しているすべてのワークスペースとの関連を解除します。\n\nこの操作は取り消すことができません。",
    "toast-deleted": "ルーターが削除されました",
    "toast-delete-failed": "ルーターの削除に失敗しました: {{error}}",
    "new-router": {
      title: "新しいモデルのルーターを作成する",
      name: "名前",
      "name-placeholder": "例：コスト最適化ツール",
      description: "説明",
      "description-placeholder": "任意の説明",
      "fallback-label": "主要なプロバイダーおよびモデル",
      "fallback-description":
        "以下の状況で使用されます。\n* どのルーティングルールにも一致しない場合\n* LLMによって分類されたルールを評価する場合",
      "cooldown-label": "キャッシュクールダウン (秒)",
      "cooldown-help":
        "ルーティングの決定が再評価されるまでの、キャッシュの保持時間を設定します。キャッシュを無効にするには、0に設定してください。",
      "name-required": "氏名が必須です。",
      "fallback-required": "主要な提供者とモデルが必要です。",
      cancel: "キャンセル",
      create: "ルーターを作成する",
    },
    "edit-router": {
      "back-to-routers": "モデルルーターに戻る",
      title: "ルーターの編集: {{name}}",
      save: "変更を保存",
      "toast-update-failed": "ルーターのアップデートが失敗しました",
    },
    rules: {
      title: "ルーティングルール",
      "title-with-name": "ルーティングルール：{{name}}",
      description:
        "特定のプロバイダやモデルにチャットメッセージが送信されるタイミングと方法を決定するルールを定義する。",
      "add-rule": "ルールを追加",
      "delete-confirm": 'ルール "{{title}}"を削除しますか？',
      "toast-delete-failed": "ルールを削除できませんでした",
      "toast-reorder-failed": "再注文に関するルールが適用されなかった",
      "no-rules": "まだルールは決まっていません。",
      "empty-description":
        "チャットメッセージを特定のプロバイダやモデルにルーティングを開始するためのルールを追加する。",
      "new-rule-button": "新しい規則",
      "calculated-section-label":
        "計算されたルール — 優先順位に基づいて、最初に評価",
      "llm-section-label":
        "LLMのルール—計算されたルールに一致しない場合に、まとめて評価",
      "llm-rule-body":
        "次に、<desc>「{{description}}」</desc> にマッチし、その後、<route>へルーティングします。",
      "calculated-no-conditions":
        "条件なし—ルート：<route>へ、{{route}}、</route>",
      "calculated-single-condition":
        'もし <prop>が条件{{property}}、</prop>が条件{{comparator}}、そして<val>が条件 "{{value}}"、</val>である場合、<route>へ移動する',
      "calculated-multi-condition":
        "もし、[{{quantifier}}]が[<cond>]である場合、[{{conditions}}]、[</cond>]を通過して、[<route>]、[{{route}}]、[</route>]へ移動する。",
      "comparator-contains": "これには",
      "comparator-matches": "試合",
      "comparator-between": "間、間隔",
      "badge-llm": "大規模言語モデル",
      "badge-calculated": "計算された",
      "aria-drag-to-reorder": "ドラッグして並び順を変更",
      "aria-edit-rule": "編集規則",
      "aria-delete-rule": "ルールを削除する",
      "quantifier-any": "何でも",
      "quantifier-all": "すべて",
    },
    "rule-form": {
      "title-label": "タイトル",
      "rule-type": "ルールの種類",
      "property-label": "不動産",
      "property-select": "選択",
      "comparator-label": "比較ツール",
      "comparator-select": "選択",
      "value-label": "価値",
      "add-condition": "条件を追加する",
      "remove-condition": "条件を削除する",
      "conditions-incomplete":
        "条件 {{index}} は不完全です。プロパティ、比較演算子、および値を入力してください。",
      "match-description-label": "試合の説明",
      "match-description-placeholder":
        "例えば、「ユーザーが、法律、契約、またはコンプライアンスに関する情報を求めている」",
      "match-description-help":
        "このルールが適用される状況を説明してください。LLMは、この状況に基づいて、このルールを使用すべきかどうかを判断します。",
      "route-to-label": "提供者およびモデルへのアクセス方法",
      "route-to-description":
        "このルールに合致する場合、このプロバイダ/モデルを使用してください。",
      cancel: "キャンセル",
      saving: "保存中...",
      "update-rule": "更新ルール",
      "create-rule": "ルールを作成",
      "title-required": "タイトルは必須です",
      "toast-save-failed": "ルールを保存できませんでした",
      "type-calculated-label": "計算された",
      "type-calculated-description":
        "メッセージの内容、トークン数、または時間帯などのプロパティに基づいてマッチングを行う。",
      "type-llm-label": "LLM 分類",
      "type-llm-description":
        "LLM（大規模言語モデル）を使用して、提供された説明に基づいてメッセージを分類します。",
      "prop-prompt-content": "プロンプトの内容",
      "prop-token-count": "会話トークンの数",
      "prop-message-count": "会話メッセージの件数",
      "prop-current-hour": "現在時間 (0-23)",
      "prop-has-image": "画像が添付されている",
      "cmp-contains": "これには",
      "cmp-matches-regex": "正規表現とのマッチング",
      "cmp-equals": "等しい",
      "cmp-not-equals": "等しいとは限らない",
      "cmp-greater-than": "より大きい",
      "cmp-greater-than-or-equal": "「以上」",
      "cmp-less-than": "より少ない",
      "cmp-less-than-or-equal": "以下",
      "cmp-between": "（これを含む）",
      "placeholder-between-hour": "例：9:00～17:00",
      "placeholder-between-numeric": "例：10,50",
      "placeholder-hour": "例：18 (0-23)",
      "placeholder-message-count": "例：10",
      "placeholder-numeric": "例：4000",
      "placeholder-contains": "例えば、コード、Python、Rust",
      "placeholder-matches": "例：/\\bpython\\b/i",
      "placeholder-default": "例：コード",
      "help-contains":
        "カンマ区切りのリスト—プロンプトに指定された値のいずれかが含まれている場合に一致します（大文字・小文字を区別しません）。",
      "help-matches":
        "正規表現パターン。大文字・小文字を区別する設定 (デフォルトは大文字・小文字を区別しない) を `/pattern/` のフラグで指定します。",
      "bool-true": "真",
      "bool-false": "誤り",
    },
    "provider-picker": {
      "select-provider": "サービスプロバイダーを選択",
      "setup-required": "（設定が必要です）",
      "loading-models": "モデルの読み込み中...",
      "select-model": "モデルを選択",
      "enter-model": "モデル名を入力してください",
      "select-provider-first": "まず、サービスプロバイダーを選んでください。",
      "configure-to-continue": "{{name}}の設定を完了してください",
      "configure-provider": "{{name}} の設定",
      "setup-credentials":
        "{{name}} をルーティング先として使用するために、必要な認証情報を入力してください。",
      cancel: "キャンセル",
      "save-settings": "設定を保存する",
      "toast-save-failed": "設定の保存に失敗しました：{{error}}",
    },
    "router-selection": {
      "loading-routers": "カスタムルーターの読み込み中...",
      "no-routers-prefix-settings":
        "現時点では、どのルーターも設定されていません。",
      "no-routers-prefix-workspace": "設定されたルーターは存在しません。",
      "no-routers-link": "モデルルーターの設定で作成",
      "model-router-label": "モデルルーター",
      "select-router": "ルーターを選択する",
      "select-description":
        "この作業スペースで使用するルーターを選択してください。",
    },
    chat: {
      "routed-to": "<route>、{{model}}、</route> 宛にルーティング",
      "routed-to-rule":
        "<route>～</route>を経由して、<rule>～</rule>へルーティング",
    },
  },
  imageGeneration: {
    title: "画像生成の好み",
    description:
      "`/img` コマンドを使用して画像を生成するために使用するプロバイダーを設定します。",
    provider: "画像生成サービスプロバイダー",
    card: {
      "failed-to-load": "画像の読み込みに失敗しました。",
      "alt-text": "生成された画像",
      edit: "編集",
      download: "ダウンロード",
    },
    pending: {
      heading: "画像の生成中…",
      description:
        "これには少し時間がかかる場合があります。準備が整ったら、こちらに表示されます。",
      aborted: "画像の生成は中止されました。",
    },
  },
  "admin-users": {
    title: "ユーザー",
    description:
      "これはこのインスタンスにアカウントを持つすべてのアカウントです。アカウントを削除すると、そのユーザーのアクセス権は即座に失われます。",
    "add-user": "ユーザーを追加",
    table: {
      username: "ユーザー名",
      email: "メールアドレス",
      role: "ロール",
      status: "ステータス",
      "date-added": "追加日",
    },
    owner: "オーナー",
    active: "アクティブ",
    suspended: "停止中",
    "role-default-suffix": "（デフォルト）",
    permissions: {
      title: "権限",
      all: "このインスタンスのすべての権限を保持しています。",
      none: "特別な権限はありません - 追加されたワークスペースでチャットのみ可能です。",
    },
    "message-limit": {
      label: "1日あたりのメッセージ数を制限",
      description:
        "このユーザーが24時間以内に実行できる成功したクエリまたはチャットの数を制限します。",
      "limit-label": "1日あたりのメッセージ上限",
    },
    modal: {
      "new-title": "インスタンスにユーザーを追加",
      "edit-title": "{{username}} を編集",
      username: "ユーザー名",
      "username-placeholder": "ユーザーのユーザー名",
      email: "メールアドレス",
      "email-placeholder": "user@example.com",
      "email-help": "アカウント所有者の識別と連絡に使用されます。",
      "email-help-edit":
        "パスワードはここでは設定しません - ユーザー一覧の「パスワードをリセット」から新しいパスワードを発行してください。",
      bio: "自己紹介",
      "bio-placeholder": "ユーザーの自己紹介",
      role: "ロール",
      "role-placeholder": "ロールを選択",
      "password-note":
        "初期パスワードが自動生成され、ユーザー作成後に一度だけ表示されます。ユーザーはインスタンスを使用する前にパスワードを変更する必要があります。",
      cancel: "キャンセル",
      add: "ユーザーを追加",
      adding: "追加中...",
      update: "ユーザーを更新",
      error: "エラー: {{error}}",
    },
    row: {
      edit: "編集",
      "reset-password": "パスワードをリセット",
      suspend: "停止",
      unsuspend: "停止を解除",
      delete: "削除",
      "reset-title": "{{username}} のパスワードをリセットしますか？",
      "reset-description":
        "新しいパスワードが生成され、一度だけ表示されます。現在のパスワードは直ちに無効になり、次回ログイン時に新しいパスワードを設定する必要があります。",
      "suspend-title": "{{username}} を停止しますか？",
      "unsuspend-title": "{{username}} の停止を解除しますか？",
      "suspend-description":
        "停止するとログアウトされ、管理者が停止を解除するまで再ログインできなくなります。",
      "unsuspend-description":
        "このユーザーは NexusAI のこのインスタンスに再度ログインできるようになります。",
      "delete-title": "{{username}} を削除しますか？",
      "delete-description":
        "削除するとログアウトされ、NexusAI のこのインスタンスを利用できなくなります。この操作は元に戻せません。",
      "suspend-toast": "ユーザーを停止しました。",
      "unsuspend-toast": "ユーザーの停止を解除しました。",
      "delete-toast": "ユーザーをシステムから削除しました。",
      "new-password": "新しいパスワード",
      "aria-suspend": "{{username}} を停止",
      "aria-unsuspend": "{{username}} の停止を解除",
    },
  },
  "admin-invites": {
    title: "招待",
    description:
      "組織のメンバーが受け取ってサインアップできる招待リンクを作成します。招待リンクは1人のユーザーのみが使用できます。",
    "create-link": "招待リンクを作成",
    table: {
      status: "ステータス",
      email: "メールアドレス",
      "accepted-by": "受諾者",
      "created-by": "作成者",
      created: "作成日",
    },
    empty: "招待はまだありません",
    "empty-description":
      "このインスタンスに誰かを招待するリンクを作成しましょう。",
    "deleted-user": "削除されたユーザー",
    row: {
      copy: "招待リンクをコピー",
      copied: "コピーしました",
      delete: "削除",
      "delete-title": "この招待を無効にしますか？",
      "delete-description":
        "実行後はこの招待を使用できなくなります。この操作は元に戻せません。",
      "delete-confirm": "無効にする",
      disabled: "無効",
    },
    modal: {
      title: "新しい招待を作成",
      error: "エラー: {{error}}",
      "link-copied": "招待リンクをクリップボードにコピーしました",
      "emailed-to": "<b>{{email}}</b> にもメールを送信しました。",
      "not-emailed-disabled":
        "メールは送信されませんでした - SMTP が無効か設定が不完全です。<a>設定 → SMTP</a> で設定するか、上のリンクをコピーしてご自身で共有してください。",
      "not-emailed-failed":
        "メールは送信されませんでした - 送信に失敗しました{{reason}}。上のリンクをコピーしてご自身で共有してください。",
      helper:
        "作成後、リンクをコピーして相手に送信できます。相手は <b>デフォルト</b> ロールでサインアップし、下で選択したワークスペースに参加します。",
      "email-label": "メールアドレス（任意）",
      "email-help":
        "SMTP が設定されている場合、作成と同時に招待リンクがこのアドレスへ送信されます。自分で共有するリンクだけが必要な場合は空欄のままにしてください。",
      "pick-user": "既存ユーザーのメールアドレスを選択…",
      "email-placeholder": "someone@example.com",
      "workspaces-label": "ワークスペースに追加",
      "workspaces-selected": "{{total}} 件中 {{count}} 件を選択",
      "workspaces-help":
        "任意です。この招待で参加した人はここで選択したワークスペースに追加されます - 選択しない場合はどのワークスペースにも所属せず、受諾後に割り当てることができます。",
      cancel: "キャンセル",
      create: "招待を作成",
      close: "閉じる",
    },
  },
  smtp: {
    title: "SMTP / 送信メール",
    description:
      "NexusAI がシステムメール（パスワードリセット、招待、通知）の送信に使用するメールボックスを設定します。インスタンスのオーナーのみが操作できます。",
    "enable-aria": "SMTP を有効にする",
    "enable-title": "送信メールを有効にする",
    "enable-description":
      "オフの場合、以下の項目が入力されていても NexusAI はメールを送信しません。",
    "service-label": "メールサービス",
    "service-placeholder": "サービスを選択",
    providers: {
      google: "Google (Gmail)",
      microsoft: "Microsoft 365（Office 365 職場/学校）",
      outlook: "Outlook.com / Hotmail（個人）",
      custom: "カスタム SMTP サーバー",
    },
    hints: {
      google:
        "smtp.gmail.com を使用します。Google アカウントでサインインし、アプリパスワード（2段階認証が必要）を生成して以下のパスワードとして使用してください。",
      microsoft:
        "職場/学校の Microsoft 365 メールボックス向けに smtp.office365.com を使用します。テナントで MFA が有効な場合はアプリパスワードが必要です。",
      outlook:
        "個人の Outlook.com/Hotmail メールボックス向けに smtp-mail.outlook.com を使用します。2段階認証が有効な場合は Microsoft アカウントのセキュリティ設定からアプリパスワードを生成してください。",
      custom:
        "任意の SMTP サーバーのホスト、ポート、セキュリティモードを入力してください。",
    },
    host: "ホスト",
    "host-placeholder": "smtp.example.com",
    port: "ポート",
    "tls-aria": "TLS を使用",
    "tls-label": "TLS を使用（通常ポート 465 ではオン、587 ではオフ）",
    username: "ユーザー名 / メールボックスアドレス",
    "username-placeholder": "you@example.com",
    password: "パスワード / アプリパスワード",
    "password-unchanged": "変更なし",
    "password-placeholder": "アプリパスワード",
    "from-email": "送信元アドレス",
    "from-email-placeholder": "noreply@example.com",
    "from-name": "送信者名",
    "from-name-placeholder": "NexusAI",
    saving: "保存中…",
    save: "変更を保存",
    "save-failed": "SMTP 設定の保存に失敗しました。",
    saved: "SMTP 設定を保存しました。",
    "test-title": "テストメールを送信",
    "test-description":
      "まず設定を保存し、自分宛にテストメッセージを送信して動作を確認してください。",
    "test-placeholder": "you@example.com",
    "test-send": "テストメールを送信",
    "test-sending": "送信中…",
    "test-success": "{{email}} にテストメールを送信しました。",
    "test-failed": "テストメールの送信に失敗しました。",
  },
  "generated-password": {
    title: "初期パスワード",
    "give-to":
      "このパスワードを <b>{{username}}</b> に渡してください。初回ログイン時に自分のパスワードを設定する必要があります。",
    generic:
      "このユーザーは次回ログイン時に自分のパスワードを設定する必要があります。",
    "copy-aria": "パスワードをコピー",
    warning:
      "今すぐコピーしてください - このパスワードは二度と表示されません。紛失した場合は、ユーザーのパスワードをリセットして新しいものを生成してください。",
    "emailed-to": "<b>{{email}}</b> にもメールを送信しました。",
    "the-user": "ユーザー",
    "not-emailed":
      "自動送信されませんでした - SMTP が無効か設定が不完全です。上のパスワードを直接共有してください。",
    done: "完了",
  },
  "provider-options": {
    "api-key": "API キー",
    "api-key-optional": "API キー（任意）",
    "base-url": "ベース URL",
    "auth-token": "認証トークン",
    "chat-model-selection": "チャットモデルの選択",
    "model-preference": "モデル設定",
    "selected-model": "選択中のモデル",
    "select-option": "オプションを選択",
    "select-model": "モデルを選択",
    "loading-models": "-- 利用可能なモデルを読み込み中 --",
    "no-models-found": "モデルが見つかりません！",
    "available-models": "利用可能なモデル",
    "your-loaded-models": "読み込み済みのモデル",
    "downloaded-models": "ダウンロード済みのモデル",
    "discovered-models": "検出されたモデル",
    "model-context-window": "モデルのコンテキストウィンドウ",
    "automatically-managed": "自動管理",
    "max-tokens": "最大トークン数",
    "stream-timeout": "ストリームタイムアウト（ミリ秒）",
    "stream-timeout-placeholder":
      "トークン応答の間隔がこの値を超えるとストリームを自動的に終了します",
    "embedding-model": "埋め込みモデル",
    "embedding-model-name": "埋め込みモデル名",
    "embedding-model-selection": "埋め込みモデルの選択",
    "available-embedding-models": "利用可能な埋め込みモデル",
    "max-embedding-chunk": "埋め込みチャンクの最大長",
    "max-embedding-chunk-help":
      "埋め込み時のテキストチャンクの最大文字数です。",
    "output-dimensions": "出力次元数",
    "assume-default-dimensions": "デフォルトの次元数を使用",
    "transcription-model": "文字起こしモデル",
    "voice-model": "音声モデル",
    "voice-model-selection": "音声モデルの選択",
    "tts-model": "TTS モデル",
  },
  "web-search": {
    engine: "エンジン",
    "get-free-key": "無料の API キーは <a>{{provider}} から</a>取得できます。",
    "get-key": "API キーは <a>{{provider}} から</a>取得できます。",
    "api-key-placeholder": "{{provider}} の API キー",
    "bing-key":
      "Bing Web Search API のサブスクリプションキーは <a>Azure ポータルから</a>取得できます。",
    "bing-steps-title":
      "Bing Web Search API のサブスクリプションを設定する手順:",
    "bing-step-1": "Azure ポータルにアクセスします:",
    "bing-step-2":
      "Azure アカウントを新規作成するか、既存のアカウントでサインインします。",
    "bing-step-3":
      "「リソースの作成」セクションに移動し、「Grounding with Bing Search」を検索します。",
    "bing-step-4":
      "「Grounding with Bing Search」リソースを選択し、新しいサブスクリプションを作成します。",
    "bing-step-5": "ニーズに合った料金プランを選択します。",
    "bing-step-6":
      "Grounding with Bing Search サブスクリプションの API キーを取得します。",
    "searxng-base-url": "SearXNG API ベース URL",
    "base-url-optional": "ベース URL（任意）",
    "crw-self-host": "<a>セルフホスト</a>することもできます。",
    "duckduckgo-ready": "DuckDuckGo は追加設定なしでそのまま利用できます。",
    "you-notice":
      "You.com は API キーなしでも利用できます（無料枠、IP 単位のレート制限あり）。上限を引き上げるには <a>You.com から</a>API キーを取得してください。",
  },
  "agent-builder": {
    common: {
      "select-or-create-variable": "変数を選択または作成",
      "insert-variable": "変数を挿入",
      "select-variable": "変数を選択",
      "select-option": "オプションを選択",
      "store-result-in": "結果の保存先",
      "result-variable": "結果変数",
      url: "URL",
    },
    flowInfo: {
      name: "フロー名",
      "name-help": "LLM が理解しやすい名前をフローに付けることが重要です。",
      "name-examples":
        '"SendMessageToDiscord", "CheckStockPrice", "CheckWeather"',
      "name-placeholder": "フロー名を入力",
      description: "説明",
      "description-help":
        "LLM が理解しやすい説明をフローに付けることも同じく重要です。フローの目的、使用される状況、その他の関連情報を必ず含めてください。",
      "description-placeholder": "フローの説明を入力",
    },
    start: {
      "variable-name": "変数名",
      "initial-value": "初期値",
      "delete-variable": "変数を削除",
      "add-variable": "変数を追加",
    },
    llmInstruction: {
      instruction: "指示",
      "instruction-placeholder": "LLM への指示を入力...",
    },
    apiCall: {
      "url-placeholder": "https://api.example.com/endpoint",
      method: "メソッド",
      headers: "ヘッダー",
      "add-header": "ヘッダーを追加",
      "header-name": "ヘッダー名",
      value: "値",
      "remove-header": "ヘッダーを削除",
      "request-body": "リクエストボディ",
      json: "JSON",
      "raw-text": "プレーンテキスト",
      "form-data": "フォームデータ",
      key: "キー",
      "remove-field": "フィールドを削除",
      "add-form-field": "フォームフィールドを追加",
      "raw-body-placeholder": "リクエストボディを入力...",
      "store-response-in": "レスポンスの保存先",
    },
    website: {
      "url-placeholder": "https://example.com",
      action: "アクション",
      "read-content": "コンテンツを読み取る",
      "click-element": "要素をクリック",
      "type-text": "テキストを入力",
      "css-selector": "CSS セレクター",
      "selector-placeholder": "#element-id または .class-name",
    },
    file: {
      operation: "操作",
      read: "ファイルを読み取る",
      write: "ファイルに書き込む",
      append: "ファイルに追記する",
      path: "ファイルパス",
      "path-placeholder": "/path/to/file",
      content: "内容",
      "content-placeholder": "ファイルの内容...",
    },
    code: {
      language: "言語",
      javascript: "JavaScript",
      python: "Python",
      shell: "Shell",
      code: "コード",
      "code-placeholder": "コードを入力...",
    },
    webScraping: {
      "url-to-scrape": "スクレイピングする URL",
      "capture-as": "ページ内容の取得形式",
      "capture-text": "テキストのみ",
      "capture-html": "生の HTML",
      "capture-selector": "CSS クエリセレクター",
      "query-selector": "クエリセレクター",
      "query-selector-help":
        "ページの内容を取得するための有効な CSS セレクターを入力してください。",
      "query-selector-placeholder":
        ".article-content, #content, .main-content など",
      summarization: "コンテンツの要約",
      "summarization-hint":
        "有効にすると、長いウェブページの内容が自動的に要約され、トークン使用量を削減します。",
      "summarization-note":
        "注意: データの品質に影響し、元の内容から具体的な詳細が失われる可能性があります。",
    },
    blockList: {
      "direct-output": "直接出力",
      "direct-output-description":
        "このブロックの出力はチャットへ直接返されます。これ以降のツール呼び出しは実行されません。",
      "coming-soon": "設定オプションは近日公開予定です...",
    },
  },
  "sql-connector": {
    title: "SQL コネクタ",
    "list-description":
      "このインスタンスに設定されたデータベース接続を一覧表示します。",
    "connections-heading": "データベース接続",
    "new-connection": "新しい接続",
    "enable-title": "SQL コネクタを有効にする",
    "enable-description":
      "エージェントが以下の接続にクエリを実行できるようにします。",
    "enable-first":
      "データベース接続を管理するには、上の SQL コネクタを有効にしてください。",
    "empty-list": "データベース接続はまだありません。",
    on: "オン",
    off: "オフ",
    "select-connection": "接続を選択",
    "select-connection-description":
      "設定するデータベース接続を一覧から選択してください。",
    "connector-off": "SQL コネクタはオフです",
    "connector-off-description":
      "左側で有効にすると、データベース接続の追加と管理ができます。",
    "toggle-failed": "接続の更新に失敗しました。",
    manage: {
      "aria-label": "接続を管理",
      edit: "接続を編集",
      delete: "接続を削除",
      "delete-title": "{{name}} を削除しますか？",
      "delete-description":
        "利用可能な SQL 接続の一覧から削除されます。この操作は元に戻せません。",
      "delete-confirm": "削除",
    },
    visibility: {
      title: "表示するワークスペース",
      description:
        "このデータベースにクエリできるワークスペースのエージェントを選択します。",
      "select-all": "すべて選択",
      "clear-all": "すべて解除",
      loading: "ワークスペースを読み込み中...",
      empty: "このインスタンスにはまだワークスペースがありません。",
      save: "表示設定を保存",
      saving: "保存中...",
      updated: "ワークスペースの表示設定を更新しました。",
      failed: "ワークスペースの表示設定の更新に失敗しました。",
    },
    modal: {
      "edit-title": "SQL 接続を編集",
      "new-title": "新しい SQL 接続",
      "edit-description": "以下でデータベースの接続情報を更新してください。",
      "new-description":
        "以下にデータベースの接続情報を追加すると、今後の SQL エージェント呼び出しで利用できるようになります。",
      warning:
        "<b>警告:</b> SQL エージェントは変更を伴わないクエリのみを実行するよう<i>指示</i>されています。ただしこれは、ハルシネーションによるデータ削除を<b>防ぐものではありません</b>。<b>READ_ONLY</b> 権限を持つユーザーでのみ接続してください。",
      "select-engine": "SQL エンジンを選択",
      name: "接続名",
      "name-placeholder": "この SQL 接続を識別する一意の名前",
      username: "データベースユーザー",
      "username-placeholder": "root",
      password: "データベースユーザーのパスワード",
      "password-placeholder": "password123",
      host: "サーバーエンドポイント",
      "host-placeholder": "データベースのホスト名またはエンドポイント",
      port: "ポート",
      "port-placeholder": "3306",
      database: "データベース",
      "database-placeholder": "エージェントが操作するデータベース",
      schema: "スキーマ（任意）",
      "schema-placeholder": "public（指定しない場合のデフォルトスキーマ）",
      encrypt: "暗号化を有効にする",
      ssl: "SSL を使用",
      cancel: "キャンセル",
      save: "接続を保存",
      validating: "検証中...",
      "validate-failed":
        "接続の検証に失敗しました。接続情報を確認してください。",
    },
  },
  "experimental-features": {
    title: "実験的機能",
    "select-feature": "実験的機能を選択してください",
    on: "オン",
    off: "オフ",
    tos: {
      title: "実験的機能の利用規約",
      intro:
        "NexusAI の実験的機能は試験運用中の機能であり、<b>オプトイン</b>制です。懸念事項がある場合は、機能を承認する前に事前に条件を提示または警告します。",
      "risks-intro":
        "このページの機能を使用すると、以下のような事態が発生する可能性があります（これらに限られません）。",
      "risk-data-loss": "データの損失。",
      "risk-quality": "結果の品質の変化。",
      "risk-storage": "ストレージ使用量の増加。",
      "risk-resources": "リソース消費量の増加。",
      "risk-cost":
        "接続中の LLM や埋め込みプロバイダーのコストまたは使用量の増加。",
      "risk-bugs": "NexusAI 使用時の不具合や問題の発生。",
      "conditions-intro":
        "実験的機能の使用には、以下のような条件も伴います（これらに限られません）。",
      "condition-removal":
        "機能が今後のアップデートで存在しなくなる場合があります。",
      "condition-stability": "使用中の機能は現時点で安定していません。",
      "condition-availability":
        "この機能は、今後のバージョン、構成、またはサブスクリプションの NexusAI では利用できない場合があります。",
      "condition-privacy":
        "ベータ機能の使用時も、プライバシー設定は<b>尊重されます</b>。",
      "condition-change":
        "これらの条件は今後のアップデートで変更される場合があります。",
      "docs-prefix":
        "機能を利用するにはこのダイアログの承認が必要です。詳しくは次をご覧ください:",
      "docs-or-email": "またはメール:",
      reject: "拒否して閉じる",
      accept: "理解しました",
    },
  },
  "admin-workspaces": {
    table: {
      name: "名前",
      link: "リンク",
      users: "ユーザー",
      status: "ステータス",
      "created-on": "作成日",
    },
  },
  "workspace-members": {
    title: "ワークスペースメンバー",
    table: {
      username: "ユーザー名",
      role: "ワークスペースのロール",
      "system-role": "システムロール",
      "date-added": "追加日",
    },
    empty: "ワークスペースメンバーはいません",
    description:
      '"{{workspace}}" にアクセスできるユーザーを管理し、ワークスペースのロールを割り当てます。',
    "manage-users": "ユーザーを管理",
  },
  "browser-extension-keys": {
    table: {
      "connection-string": "拡張機能の接続文字列",
      "created-by": "作成者",
      "created-at": "作成日時",
      actions: "操作",
    },
    "empty-description":
      "ブラウザ拡張機能をこのインスタンスに接続するためのキーを生成します。",
    empty: "API キーはまだありません",
    error: "エラー: {{error}}",
  },
  sidebar: {
    workspaces: "ワークスペース",
    "new-workspace": "新しいワークスペース",
    "new-workspace-description":
      "ドキュメントとチャットのためのスペースを作成します",
    home: "ホーム",
    "no-workspaces": "ワークスペースはまだありません。",
    logo: "ロゴ",
    "toggle-sidebar": "サイドバーの表示切替",
    "general-appearance": "全般の外観設定",
  },
  "agent-panel": {
    "agent-flow": "エージェントフロー",
    "flows-description": "このインスタンスに設定されたフローを一覧表示します。",
    "skills-title": "エージェントのスキルと設定",
    "skills-description": "スキルと接続済みサービスを一覧表示します。",
    "agent-flows": "エージェントフロー",
    "custom-skills": "カスタムスキル",
    back: "戻る",
    "create-flow": "フローを作成",
    "open-builder": "ビルダーを開く",
  },
  "vector-providers": {
    pgvector: {
      "connection-string": "Postgres 接続文字列",
      "connection-string-tooltip":
        "Postgres データベースへの接続文字列です。形式は次のとおりです:",
      "permissions-intro": "データベースのユーザーには次の権限が必要です:",
      "permission-read": "データベースへの読み取り権限",
      "permission-read-schema": "データベーススキーマへの読み取り権限",
      "permission-create": "データベースへの作成権限",
      "extension-warning":
        "データベースに pgvector 拡張機能がインストールされている必要があります。",
      "table-name": "ベクターテーブル名",
      "table-name-tooltip":
        "ベクターを保存する Postgres データベース内のテーブル名です。",
      "table-name-default": "デフォルトのテーブル名は次のとおりです:",
      "table-name-warning":
        "このテーブルはデータベースに存在していてはいけません。自動的に作成されます。",
    },
    milvus: {
      address: "Milvus DB アドレス",
      username: "Milvus ユーザー名",
      password: "Milvus パスワード",
    },
  },
  embeds: {
    modal: {
      "max-chats-day": "1日あたりの最大チャット数",
      "max-chats-day-hint":
        "この埋め込みチャットが24時間以内に処理できるチャット数を制限します。0 は無制限です。",
      "max-chats-session": "セッションあたりの最大チャット数",
      "max-chats-session-hint":
        "セッションユーザーがこの埋め込みで24時間以内に送信できるチャット数を制限します。0 は無制限です。",
      "message-limit": "メッセージ履歴の上限",
      "message-limit-hint":
        "チャットのコンテキストに含める過去のメッセージ数です。デフォルトは 20 です。",
      "model-override": "動的なモデル指定を有効にする",
      "model-override-hint":
        "ワークスペースのデフォルトを上書きして、使用する LLM モデルを指定できるようにします。",
      "temperature-override": "動的な LLM temperature を有効にする",
      "temperature-override-hint":
        "ワークスペースのデフォルトを上書きして、LLM の temperature を指定できるようにします。",
      "prompt-override": "プロンプトの上書きを有効にする",
      "prompt-override-hint":
        "ワークスペースのデフォルトを上書きして、システムプロンプトを指定できるようにします。",
      error: "エラー: {{error}}",
    },
  },
  "hub-import": {
    title: "コミュニティハブからアイテムをインポート",
    "intro-1":
      "コミュニティハブでは、エージェントスキル、システムプロンプト、スラッシュコマンドなどを探して共有・インポートできます。",
    "intro-2":
      "これらのアイテムは NexusAI チームとコミュニティによって作成されており、NexusAI を使い始めるのにも、ニーズに合わせて拡張するのにも最適です。",
    "intro-3":
      "コミュニティハブには<b>非公開</b>アイテムと<b>公開</b>アイテムがあります。非公開アイテムはあなたにのみ表示され、公開アイテムは全員に表示されます。",
    warning:
      "非公開アイテムを取り込む場合は、そのアイテムが所属する<b>チームに共有されている</b>こと、および<a>接続キー</a>を追加済みであることを確認してください。",
    "item-id": "コミュニティハブのアイテムインポート ID",
    "item-id-placeholder": "allm-community-id:agent-skill:1234567890",
    "enter-item-id": "アイテム ID を入力してください",
  },
  ui: {
    "select-option": "オプションを選択",
    "select-model": "モデルを選択",
    "select-model-dashed": "-- モデルを選択 --",
    "type-or-select-model": "モデルを入力または選択",
    "waiting-for-models": "-- モデルを待機中 --",
    "select-role": "ロールを選択",
    "select-region": "リージョンを選択",
    "select-voice": "音声を選択",
    "select-engine": "エンジンを選択",
    "search-models": "モデルを検索",
    "search-users": "ユーザーを検索",
    "select-all-visible-users": "表示中のユーザーをすべて選択",
    "open-actions": "操作メニューを開く",
    "your-password": "パスワード",
    "create-new-folder": "新しいフォルダを作成",
    "enter-folder-name": "フォルダ名を入力",
    "new-thread": "新しいスレッド",
    "delete-selected": "選択項目を削除",
    "enter-thread-name": "スレッド名を入力",
    "mark-thread-deletion": "スレッドを削除対象にする",
    "close-lightbox": "ライトボックスを閉じる",
    "next-image": "次の画像",
    "copy-error-details": "エラーの詳細をコピー",
    "remove-icon": "アイコンを削除",
    "remove-from-queue": "キューから削除",
    "agent-thinking": "エージェントが考えています...",
    "agent-finished-thinking": "エージェントの思考が完了しました",
    "model-thinking": "モデルが考えています",
    "routing-to-model": "モデルへルーティング中...",
    "no-agent-flows": "エージェントフローが見つかりません",
    "no-imported-skills": "インポート済みのスキルが見つかりません",
    "no-event-logs": "イベントログが見つかりません",
    "your-api-key": "API キーを入力...",
    "your-client-secret": "クライアントシークレットを入力...",
    "enter-api-token": "API トークンを入力してください",
    "enter-auth-token": "認証トークンを入力してください",
    "enter-api-key-dashed": "-- API キーを入力 --",
    "search-web-search-providers": "利用可能なウェブ検索プロバイダーを検索",
    "search-stt-providers": "音声認識プロバイダーを検索",
    "search-tts-providers": "音声合成プロバイダーを検索",
    "search-embedding-providers": "すべての埋め込みプロバイダーを検索",
    "search-image-providers": "画像生成プロバイダーを検索",
    "search-llm-providers": "すべての LLM プロバイダーを検索",
    "search-available-llm-providers": "利用可能な LLM プロバイダーを検索",
    "search-transcription-providers": "音声文字起こしプロバイダーを検索",
    "search-vectordb-providers":
      "すべてのベクターデータベースプロバイダーを検索",
    "document-name": "ドキュメント名",
    "time-until-refresh": "次回更新までの時間",
    "created-on": "作成日",
    "accept-invitation": "招待を承諾する",
    "create-account": "アカウントを作成",
    "use-existing-account": "既存のアカウントを使用",
    "confirm-it-is-you": "本人であることを確認",
    "what-to-clear": "消去する対象",
    "choose-an-account": "アカウントを選択",
    "hub-account-title": "NexusAI コミュニティハブのアカウント",
    "hub-api-key-placeholder": "NexusAI Hub の API キーを入力してください",
    "add-to-workspace": "ワークスペースに追加",
    "apply-to-workspace": "ワークスペースに適用",
    "max-vector-text-length": "ベクトル化するテキストの最大長",
    "device-name": "デバイス名",
    "register-device":
      "スマートフォンからこのインスタンスを利用するデバイスを登録します。",
    "admin-username-placeholder": "管理者のユーザー名",
    "admin-password-placeholder": "管理者のパスワード",
    "embedding-deployment-name": "埋め込みデプロイメント名",
    "azure-embedding-deployment-placeholder":
      "Azure OpenAI の埋め込みモデルのデプロイメント名",
    "azure-chat-deployment-placeholder":
      "Azure OpenAI のチャットモデルのデプロイメント名",
    "no-image-models":
      "このプロバイダーでは画像モデルが見つかりませんでした - モデル名を手動で入力してください。",
    "image-model-name": "画像モデル名",
    "fetch-wikis": "Wiki をドキュメントとして取得",
    "test-prompt-placeholder":
      "これはテスト用のプロンプトです。LLM についての詩で応答してください。",
    "preset-description-placeholder": "LLM についての詩で応答します。",
    "voice-model-identifier": "音声モデルの識別子",
    "tts-model-identifier": "TTS モデルの識別子",
    "stt-model-identifier": "STT モデルの識別子",
    "feature-docs-warnings": "機能のドキュメントと注意事項",
    "role-description-placeholder": "このロールの用途",
    "slash-commands-inherited":
      "すべてのワークスペースに継承されます。ワークスペース側で同名のコマンドを定義すると、既定の設定を上書きできます。",
    "reserved-to-owner": "オーナー専用",
    "refusal-placeholder":
      "クエリモードで関連するコンテキストが見つからなかったときに返されるテキストです。",
    "model-name-exact-placeholder":
      "API で参照されるとおりに正確なモデル名を入力してください（例: gpt-4.1-nano）",
    "model-id-for-chat": "チャットリクエストに使用するモデル ID",
    "no-caching": "キャッシュしない",
    "no-cache": "キャッシュしない",
    "recovery-codes-once": "これらのリカバリーコードは一度しか表示されません！",
    "database-name": "データベース名",
    "pinecone-index-name": "Pinecone インデックス名",
  },
  help: {
    "paperless-base-url":
      "Paperless-ngx インスタンスが動作している URL です（例: http://localhost:8000）",
    "drupal-wiki-token":
      "認証には API トークンが必要です。ユーザー用の API トークンを生成する方法は、Drupal Wiki の<a>マニュアル</a>を参照してください。",
    "lmstudio-context-window":
      "コンテキストウィンドウの上限を上書きします。空欄にするとモデルから自動検出します（検出に失敗した場合は 4096 が使用されます）。",
    "telemetry-note":
      "すべてのイベントで IP アドレスは記録されず、<b>個人を特定できる</b>内容、設定、チャット、その他の利用状況以外の情報も含まれません。収集されるイベントタグの一覧は <a>GitHub のこちら</a>で確認できます。",
    "finish-node":
      "これがエージェントフローの終端です。上のすべてのステップが順番に実行されます。",
    "agent-skill-settings":
      "エージェントがスキルを選択・呼び出す方法を設定します。これらはインスタンス既定値であり、各ワークスペースは自身のエージェント設定で個別に上書きできます。",
    agents:
      "一覧からエージェントスキル、連携、フロー、または MCP サーバーを選択してください。",
    "default-system-prompt":
      "システムプロンプトは AI の応答と振る舞いを形づくる指示です。このプロンプトは新しく作成されるすべてのワークスペースに自動的に適用されます。<b>特定のワークスペース</b>のシステムプロンプトを変更するには、<b>ワークスペース設定</b>でプロンプトを編集してください。既定のシステムプロンプトに戻すには、この欄を空にして変更を保存します。",
    "toggle-3":
      "この機能は、ウェブサイト、Confluence、YouTube、GitHub のファイルなど、ウェブ由来のコンテンツにのみ適用されます。",
    "toggle-2":
      "監視中のドキュメントは、参照しているすべてのワークスペースで同時に自動更新されます。",
    toggle:
      "ドキュメントを「監視」対象に指定できるようにします。監視中のドキュメントの内容は定期的に取得され、NexusAI 上で更新されます。",
    "role-modal":
      "このロールはシステム管理者権限を持つため、下のチェックボックスに関わらず、今後のアップデートで追加されるものも含めてすべての権限を保持します。",
    "factory-reset":
      "デプロイ全体を消去し、インストール直後のようにセットアップ画面からやり直します。上のリセットとは異なり、この操作では<strong>あなた自身のアカウント</strong>と、LLM・埋め込み・ベクターデータベースの設定も削除されます。",
    "reserved-permissions":
      "ここでチェックした項目はあなた専用になります。権限の解決時に他のすべてのロールから除外され、通常はワイルドカードで包含される管理者ロールからも取り除かれます。そのため該当画面は表示されなくなり、背後のルートもリクエストを拒否します。チェックを外すと、その機能は各ロールの設定どおりに戻ります。",
    "reset-instance":
      "下でチェックした項目はすべて完全に削除されます。あなた自身のアカウント、定義済みのロールと権限、および LLM・埋め込み・ベクターデータベースの設定は変更されません。",
    "transfer-ownership-2":
      "停止中のアカウントは一覧に表示されません。新しいオーナーはサインインできる必要があります。",
    "transfer-ownership":
      "このインスタンスを引き継げる相手がまだいません。所有権は有効な別のアカウントにのみ移譲できるため、まずアカウントを作成してください。",
    "new-workspace-modal":
      "このワークスペースを作成した直後は管理者のみが閲覧できます。作成後にユーザーを追加できます。",
    "new-browser-extension-api-key-modal-3":
      "拡張機能に「Connected to NexusAI」と表示されれば接続成功です。表示されない場合は、接続文字列をコピーして拡張機能に手動で貼り付けてください。",
    "new-browser-extension-api-key-modal-2":
      "「API キーを作成」をクリックすると、NexusAI がブラウザ拡張機能への自動接続を試みます。",
    "new-browser-extension-api-key-modal":
      "警告: この API キーはアカウントに紐づくすべてのワークスペースへのアクセスを許可します。共有には十分ご注意ください。",
    "code-snippet-modal":
      "ワークスペースの埋め込みチャットを、ウェブサイトの隅に表示されるヘルプデスクチャットのように動作させます。",
    "edit-embed-modal":
      "埋め込みを作成すると、ウェブサイトに公開できるリンクが発行されます。次のような簡単な",
    "new-embed-modal-5":
      "このフィルターは、下の一覧以外のドメインから届いたリクエストをすべてブロックします。",
    "new-embed-modal-4":
      "チャットモードでは一般的な質問も受け付け、ワークスペースとまったく関係のない質問にも回答できます。",
    "new-embed-modal-3":
      "チャットボットの動作方法を設定します。クエリモードでは、質問の回答に役立つドキュメントがある場合にのみ応答します。",
    "new-embed-modal-2":
      "チャットウィンドウの土台となるワークスペースです。この設定で上書きしない限り、既定値はすべてワークスペースから継承されます。",
    "new-embed-modal":
      "埋め込みを作成すると、ウェブサイトに公開できるリンクが発行されます。次のような簡単な",
    authentication:
      "NexusAI コミュニティハブの公開アイテムを取り込むだけであれば、コミュニティハブのアカウントを接続する必要はありません。",
    "agent-flow":
      "エージェントフローを使うと、エージェントから呼び出せる再利用可能な一連の処理を作成できます。",
    "agent-skill":
      "エージェントスキルは NexusAI インスタンス上でコードを実行できるため、信頼できる提供元のスキルのみをインポートしてください。インポート前にコードを確認することも推奨します。スキルの動作が不明な場合は、インポートしないでください。",
    "slash-command":
      "スラッシュコマンドは、NexusAI のワークスペースでチャットする際にプロンプトへ情報をあらかじめ入力するために使用します。",
    "system-prompt":
      "システムプロンプトは AI エージェントの振る舞いを導くために使用され、既存の任意のワークスペースに適用できます。",
    unknown:
      "コミュニティハブでアイテムが見つかりましたが、種類を判別できないか、NexusAI へのインポートにまだ対応していません。",
    "pull-and-review":
      "アイテムの取得中にエラーが発生しました。しばらくしてからもう一度お試しください。",
    "connection-modal-3":
      "NexusAI Mobile アプリで QR コードをスキャンすると、ワークスペース、チャット、スレッド、ドキュメントのライブ同期が有効になります。",
    "connection-modal-2":
      "スマートフォン上のローカルモデルでプライベートに実行するか、チャットをこのインスタンスへシームレスに中継できます。",
    "connection-modal":
      "NexusAI モバイルを使うと、ワークスペースのチャット、スレッド、ツール、ドキュメントに接続して外出先でも利用できます。",
    "privacy-and-data":
      "オープンソースプロジェクトとして、私たちはあなたのプライバシーの権利を尊重します。AI とドキュメントをプライベートかつ安全に統合する最良のソリューションを構築することに専念しています。テレメトリを無効にする場合でも、ぜひご意見やご感想をお寄せいただければ幸いです。",
    "existing-user-form":
      "既存のアカウントでサインインすると、そのアカウントが招待のワークスペースに追加されます。ロールは変更されません。",
    invite:
      "新しいアカウントで参加するか、招待のワークスペースを既存のアカウントに追加してください。",
    "new-user-modal":
      "アカウントを作成すると、この認証情報でログインしてワークスペースを使い始めることができます。",
    "agent-skill-selection-2":
      "管理者が既に設定済みのエンジンのみが表示されます。API キーはエージェントスキルの画面でインスタンス全体に対して設定します。",
    "agent-skill-selection":
      "このワークスペースのエージェントが使用できるスキルを選択します。設定はこのワークスペースにのみ適用され、他のワークスペースは独自の選択を保持します。",
    roles:
      "インスタンス設定で定義され、すべてのワークスペースで使用されるため、ここからは変更できません。",
    "gemini-options":
      "モデルが複数の次元数の出力に対応している場合に、生成される埋め込みの次元数を指定します。",
    "generic-open-ai-options-2":
      '検索用の埋め込みを作成する前に、クエリテキストの先頭へ付加するテキストです。一部のモデルでは、クエリと文章を区別するためにこれが必要です（例: "query: " や "search_query: "）。<br /><br />NexusAI はこのテキストに「:」を含め、何も<b>追加しません</b>。',
    "generic-open-ai-options":
      '保存用の埋め込みを作成する前に、各コンテンツチャンクの先頭へ付加するテキストです。一部のモデルでは、文章とクエリを区別するためにこれが必要です（例: "passage: " や "search_document: "）。<br /><br />NexusAI はこのテキストに「:」を含め、何も<b>追加しません</b>。',
    "lemonade-options":
      "埋め込みに使用する Lemonade モデルを選択します。有効な Lemonade の URL を入力するとモデルが読み込まれます。",
    "lmstudio-options-2":
      "LM Studio に接続できませんでした。URL が正しいこと、LMStudio サーバーが起動していてアクセス可能であることを確認してください。",
    "lmstudio-options":
      "LM Studio を認証やプロキシの背後で実行している場合に便利です。",
    "local-ai-options":
      "モデルが複数の次元数の出力に対応している場合に、生成される埋め込みの次元数を指定します。",
    "ollama-options-3":
      "埋め込みに使用する Ollama モデルを選択します。有効な Ollama の URL を入力するとモデルが読み込まれます。",
    "ollama-options-2":
      "この値を大きくすると複数のチャンクを同時に処理し、埋め込みが高速になります。",
    "ollama-options":
      "並列で埋め込みを行うテキストチャンク数です。値を大きくすると速くなりますが、メモリ使用量が増えます。デフォルトは 1 です。",
    "ollama-options-4":
      "Ollama の画像生成は実験的機能で、macOS でのみ利用できます。画像生成に対応していると報告するモデルのみが表示されます。",
    "aws-bedrock-llmoptions":
      "1回の応答でモデルが生成できる最大トークン数です。長い出力が必要な場合は増やしてください。デフォルトは 4096 です。",
    "docker-model-runner-options":
      "モデルのコンテキストウィンドウに使用できる最大トークン数です。",
    "foundry-options":
      "コンテキストウィンドウの上限を上書きします。空欄にするとモデルから自動検出します。大きなコンテキストで動作が重くなる場合は値を下げてください。",
    "kobold-cppoptions":
      "使用する KoboldCPP モデルを選択します。有効な KoboldCPP の URL を入力するとモデルが読み込まれます。",
    "lemonade-options-2":
      "モデルのコンテキストウィンドウに使用できる最大トークン数です。モデルがサポートする値を設定する必要があります。",
    "lmstudio-options-5":
      "LM Studio に接続できませんでした。URL が正しいこと、LMStudio サーバーが起動していてアクセス可能であることを確認してください。",
    "lmstudio-options-4":
      "LM Studio を認証やプロキシの背後で実行している場合に便利です。",
    "lmstudio-options-3":
      "LLM として LMStudio を使用する場合は、別途、埋め込みサービスの設定が必要です。",
    "local-ai-options-2":
      "LLM として LocalAI を使用する場合は、別途、埋め込みサービスの設定が必要です。",
    "ollama-llmoptions-4":
      "使用する Ollama モデルを選択します。有効な Ollama の URL を入力するとモデルが読み込まれます。",
    "ollama-llmoptions-3":
      "無効な値が入力された場合でも、チャットが失敗しないように NexusAI が処理します。",
    "ollama-llmoptions-2":
      "この項目を空欄にすると、コンテキストウィンドウの上限をモデルから自動検出し、すべてのチャットに適用します。自動検出に失敗した場合は、フォールバック値の 4096 が使用されます。",
    "ollama-llmoptions":
      "モデルのコンテキストウィンドウに使用できる最大トークン数を指定します。",
    "omlxoptions-4":
      "使用する OMLX モデルを選択します。有効な OMLX の URL を入力するとモデルが読み込まれます。",
    "omlxoptions-3":
      "無効な値が入力された場合でも、チャットが失敗しないように NexusAI が処理します。",
    "omlxoptions-2":
      "この項目を空欄にすると、コンテキストウィンドウの上限をモデルから自動検出し、すべてのチャットに適用します。自動検出に失敗した場合は、フォールバック値の 16000 が使用されます。",
    omlxoptions:
      "モデルのコンテキストウィンドウに使用できる最大トークン数を指定します。",
    "drupal-wiki":
      "完了すると、すべてのページをワークスペースへ埋め込めるようになります。",
    "paperless-ngx-2":
      "完了すると、すべてのドキュメントをワークスペースへ埋め込めるようになります。",
    "paperless-ngx":
      "Paperless-ngx インスタンスが起動しており、このマシンからアクセスできることを確認してください。",
    "generic-open-ai-options-4":
      "一部の STT サービスでは文字起こしに API キーが必要です。サービスが不要な場合は任意です。",
    "generic-open-ai-options-3":
      "音声の文字起こしに使用する、OpenAI 互換 STT サービスのベース URL を指定してください。",
    "lemonade-options-4":
      "Whisper などの文字起こしモデルを Lemonade サーバーに読み込むと、ここに表示されます。",
    "lemonade-options-3":
      "Lemonade サーバーの API キーです。Lemonade の LLM および埋め込み設定と共有されます。",
    "kokoro-options":
      "Kokoro サーバーに接続して音声を読み込めませんでした。音声 ID を手動で入力してください。",
    "open-ai-generic-options-3":
      "ほとんどの TTS サービスには複数の音声モデルがあります。使用したい音声モデルの識別子です。",
    "open-ai-generic-options-2":
      "一部の TTS サービスでは音声生成に API キーが必要です。サービスが不要な場合は任意です。",
    "open-ai-generic-options":
      "音声を生成する、OpenAI 互換 TTS サービスのベース URL を指定してください。",
    "piper-ttsoptions-2":
      "「✔」は、そのモデルが既にローカルに保存されており、実行時にダウンロードが不要であることを示します。",
    "piper-ttsoptions":
      "PiperTTS のモデルはすべてブラウザ上でローカルに動作します。低スペックの端末では負荷が高くなる場合があります。",
    "generic-open-ai-options-5":
      "音声の文字起こしに使用する OpenAI 互換サービスのベース URL です。",
    "parsed-files-menu-2":
      "コンテキストウィンドウの上限を超えました。一部のファイルは切り詰められるか、応答から除外される可能性があります。応答が不正確になったり、必要な情報が欠けたりする場合があります。",
    "parsed-files-menu":
      "コンテキストウィンドウの空きが少なくなっています。一部のファイルは切り詰められるか、応答から除外される可能性があります。より良い結果を得るには、これらのファイルをワークスペースへ直接埋め込むことをおすすめします。",
    "workspace-chat":
      "お探しのワークスペースは利用できません。削除されたか、アクセス権がない可能性があります。",
  },
};

export default TRANSLATIONS;
