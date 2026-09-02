/**
 * Japanese strings for the Telegram bot. Mirrors the keys in en.js.
 */
module.exports = {
  // ---------------------------------------------------------------- common
  "common.error":
    "申し訳ありません。問題が発生しました。もう一度お試しください。",
  "common.callback_error": "問題が発生しました。",
  "common.prev": "← 前へ",
  "common.next": "次へ →",
  "common.active": "使用中",
  "common.default_thread": "デフォルト",
  "common.unknown": "不明",

  // ------------------------------------------------------------- linking
  "link.already_linked":
    "このチャットはすでに「{{username}}」に連携されています。別のアカウントに接続する場合は、先に /unlink を送信してください。",
  "link.usage":
    "使い方: <code>/link あなたのユーザー名 123456</code>\n\nコードは NexusAI のアカウント設定から取得できます。",
  "link.rate_limited":
    "失敗が続いています。{{minutes}} 分後にもう一度お試しください。",
  "link.invalid":
    "ユーザー名またはコードが正しくありません。コードの有効期限は5分です。NexusAI で新しいコードを発行してからお試しください。",
  "link.failed": "このチャットを連携できませんでした。もう一度お試しください。",
  "link.success": "✅ <b>{{username}}</b> に連携しました。",
  "link.success_workspace":
    "現在 <b>{{workspace}}</b> ワークスペースでチャットしています。/switch でワークスペースやスレッドを変更、/language で返答の言語を選択、/help でその他のコマンドを確認できます。",
  "link.success_no_workspace":
    "まだどのワークスペースにも参加していないため、チャットする相手がありません。管理者に追加を依頼してから /switch を送信してください。",
  "unlink.done":
    "このチャットと NexusAI アカウントの連携を解除しました。新しいコードで /link を送信すると再接続できます。",
  "unlink.by_admin":
    "管理者がこのチャットと NexusAI アカウントの連携を解除しました。",
  "unlink.self": "このチャットと NexusAI アカウントの連携を解除しました。",
  "callback.not_linked":
    "このチャットは NexusAI アカウントに連携されていません。/link を送信して接続してください。",

  // --------------------------------------------------------------- start
  "start.welcome":
    "NexusAI へようこそ、{{username}} さん!\n\nメッセージは「{{workspace}}」ワークスペースに送られます。下のボタンでワークスペースの切り替えや新しいスレッドの開始ができます。/workspaces でアクセスできるワークスペース、/help でその他のコマンドを確認できます。",
  "start.welcome_no_workspace":
    "NexusAI へようこそ、{{username}} さん!\n\nまだワークスペースが選択されていません。下のボタンから選ぶか、管理者にワークスペースへの追加を依頼してください。",

  // -------------------------------------------------------------- whoami
  "whoami.signed_in_as": "ログイン中のアカウント:",
  "whoami.workspace": "ワークスペース:",
  "whoami.thread": "スレッド:",
  "whoami.language": "返答の言語:",
  "whoami.none_selected": "未選択",
  "whoami.note":
    "ここで送信した内容はすべてこのアカウントとして実行され、ウェブと同じワークスペース権限が適用されます。",

  // ---------------------------------------------------------------- menu
  "menu.shown": "ボタンバーを表示しました。/menu off で非表示にできます。",
  "menu.hidden": "ボタンバーを非表示にしました。/menu で再表示できます。",
  "menu.placeholder": "質問を入力するか、下のボタンをタップ",
  "menu.tab_workspaces": "📋 マイワークスペース",
  "menu.tab_new_thread": "🆕 新しいスレッド",
  "menu.tab_status": "ℹ️ ステータス",
  "menu.tab_language": "🌐 返答の言語",

  // ---------------------------------------------------------- workspaces
  "workspaces.none":
    "まだどのワークスペースにも参加していません。管理者に追加を依頼してください。",
  "workspaces.header": "<b>あなたのワークスペース</b> ({{count}})",
  "workspaces.header_paged":
    "<b>あなたのワークスペース</b> ({{page}}/{{pages}}、全 {{count}} 件)",
  "workspaces.footer":
    "タップで切り替えます。スレッドも選ぶ場合は /switch を使ってください。",
  "workspaces.switched": "✅ <b>{{workspace}}</b> でチャット中です。",
  "workspaces.switched_toast": "{{workspace}} に切り替えました",
  "workspaces.already_in": "すでに {{workspace}} にいます。",
  "workspaces.not_available": "このワークスペースは利用できません。",

  // -------------------------------------------------------------- switch
  "switch.none_can_create":
    "まだワークスペースがありません。作成して始めましょう!",
  "switch.create_button": "➕ ワークスペースを作成",
  "switch.select": "ワークスペースを選択:",
  "switch.select_paged":
    "ワークスペースを選択 ({{page}}/{{pages}}、全 {{count}} 件):",
  "switch.created":
    "「{{workspace}}」を作成して切り替えました。チャットを始められます!",
  "switch.create_failed": "ワークスペースの作成に失敗しました。",
  "switch.create_denied": "ワークスペースを作成する権限がありません。",

  // ------------------------------------------------------------- threads
  "thread.select": "「{{workspace}}」— スレッドを選択:",
  "thread.select_paged":
    "「{{workspace}}」— スレッドを選択 ({{page}}/{{pages}}、全 {{count}} 件):",
  "thread.chats_suffix": "{{count}} 件のチャット",
  "thread.back": "← ワークスペース一覧に戻る",
  "thread.switched": "「{{workspace}}」→ {{thread}} に切り替えました",
  "thread.switched_toast": "切り替えました!",
  "thread.not_available": "このスレッドは利用できません。",
  "thread.no_workspace":
    "ワークスペースが選択されていません。/switch で選択してください。",
  "thread.denied": "「{{workspace}}」でスレッドを作成する権限がありません。",
  "thread.create_failed": "スレッドの作成に失敗しました。",
  "thread.created":
    "「{{workspace}}」に新しいスレッドを作成しました。以降のメッセージはここに入ります。",

  // ------------------------------------------------------------- history
  "history.empty": "このスレッドにはまだメッセージがありません。",
  "history.you": "あなた:",
  "history.ai": "AI:",

  // -------------------------------------------------------------- status
  "status.workspace": "ワークスペース:",
  "status.thread": "スレッド:",
  "status.language": "返答の言語:",
  "status.provider": "LLM プロバイダー:",
  "status.model": "LLM モデル:",
  "status.native_tools": "ネイティブツール呼び出し:",
  "status.chat_mode": "チャットモード:",
  "status.enabled": "有効",
  "status.disabled": "無効",
  "status.note_no_native_tools":
    "**⚠️ 注意**\nこのプロバイダー/モデルはネイティブツール呼び出しに対応していません。ツールは @agent コマンドでのみ利用できます。",
  "status.tip_automatic_mode":
    "**💡 ヒント**\nこのワークスペースのチャットモードを「automatic」に変更すると、@agent なしでツールを使えます。",

  // --------------------------------------------------------------- reset
  "reset.done":
    "LLM 用のチャット履歴をクリアしました。これまでのメッセージは上に残りますが、文脈としては使われません。",

  // ---------------------------------------------------------------- help
  "help.header": "利用できるコマンド:",

  // --------------------------------------------------------------- proof
  "proof.no_citations": "前回の返答には引用がありません。",
  "proof.no_sources": "前回の返答に表示できる引用元はありません。",
  "proof.header":
    "📚 <b>引用</b> ({{count}} 件)\n\n表示する引用元を選択してください:",
  "proof.header_paged":
    "📚 <b>引用</b> ({{page}}/{{pages}}、全 {{count}} 件)\n\n表示する引用元を選択してください:",
  "proof.close": "閉じる",
  "proof.not_found":
    "引用元が見つかりません。もう一度 /proof をお試しください。",
  "proof.invalid_url": "引用元の URL が正しくありません。",

  // --------------------------------------------------------------- abort
  "abort.done": "返答を中止しました。",
  "abort.none": "中止できる返答はありません。",

  // ------------------------------------------------------------ language
  "language.title": "<b>返答の言語</b>",
  "language.current": "現在アシスタントが返答する言語: <b>{{language}}</b>",
  "language.note":
    "この設定は返答とボット自身のメッセージの両方に適用されます。",
  "language.changed": "✅ アシスタントは <b>{{language}}</b> で返答します。",
  "language.changed_toast": "返答の言語: {{language}}",
  "language.already": "すでに {{language}} で返答しています。",
  "language.current_suffix": "現在",

  // ---------------------------------------------------------------- model
  "model.no_workspace":
    "ワークスペースが選択されていません。/switch で選択してください。",
  "model.denied": "「{{workspace}}」のモデルを変更する権限がありません。",
  "model.denied_toast":
    "このワークスペースのモデルを変更する権限がありません。",
  "model.provider_unsupported":
    "プロバイダー「{{provider}}」は API 経由でのモデル選択に対応していません。",
  "model.none_available": "「{{provider}}」で利用できるモデルがありません。",
  "model.select": "「{{workspace}}」— モデルを選択:",
  "model.select_paged":
    "「{{workspace}}」— モデルを選択 ({{page}}/{{pages}}、全 {{count}} 件):",
  "model.cancel": "キャンセル",
  "model.cancelled": "モデルの選択をキャンセルしました。",
  "model.not_found": "モデルが見つかりません。",
  "model.updated": "「{{workspace}}」のモデルを「{{model}}」に変更しました。",
  "model.updated_toast": "モデルを更新しました!",

  // ----------------------------------------------------------------- chat
  "chat.no_workspace":
    "ワークスペースが選択されていません。/switch で選択してください。",
  "chat.account_gone":
    "NexusAI アカウントが利用できなくなりました。/link で再接続してください。",
  "chat.lost_access":
    "そのワークスペースへのアクセス権がなくなりました。/switch で別のワークスペースを選択してください。",
  "chat.daily_limit":
    "1日のメッセージ上限に達しました。明日またお試しください。",
  "chat.no_response": "返答が生成されませんでした。",
  "chat.stream_error": "返答の送信中にエラーが発生しました。",

  // ---------------------------------------------------------------- media
  "media.transcribe_empty": "音声メッセージを文字起こしできませんでした。",
  "media.voice_failed":
    "音声メッセージを処理できませんでした。もう一度お試しください。",
  "media.image_failed": "画像を処理できませんでした。もう一度お試しください。",
  "media.document_failed":
    "ドキュメントを処理できませんでした。もう一度お試しください。",
  "media.describe_image": "この画像について説明してください。",

  // ----------------------------------------------------------------- tool
  "tool.approval_title": "🔧 <b>ツールの承認が必要です</b>",
  "tool.approval_body":
    "エージェントが実行しようとしています: <b>{{skill}}</b>",
  "tool.approval_params": "<b>パラメーター:</b>",
  "tool.approval_question": "この操作を許可しますか?",
  "tool.approve": "✅ 承認",
  "tool.deny": "❌ 拒否",
  "tool.timed_out": "⏱️ <b>{{skill}}</b> の承認がタイムアウトしました。",
  "tool.expired": "この承認リクエストは期限切れです。",
  "tool.approved": "✅ <b>{{skill}}</b> を承認しました。",
  "tool.denied": "❌ <b>{{skill}}</b> を拒否しました。",
  "tool.approved_toast": "承認しました!",
  "tool.denied_toast": "拒否しました。",
  "chat.chart_failed": "グラフの描画に失敗しました。",

  // ------------------------------------------------------------- feedback
  "feedback.up": "👍 役に立った",
  "feedback.down": "👎 役に立たなかった",
  "feedback.thanks_up": "ありがとうございます - 役に立ったと記録しました。",
  "feedback.thanks_down":
    "ありがとうございます - 役に立たなかったと記録しました。",
  "feedback.cleared": "評価を取り消しました。",
  "feedback.not_available": "この回答はもう評価できません。",
  "feedback.ask_reason":
    "どこが問題でしたか? メッセージで教えてください。そのまま続けても構いません - 評価は保存済みです。",
  "feedback.reason_saved":
    "ありがとうございます - フィードバックを保存しました。",

  // ------------------------------------------------------- command descriptions
  "command.start": "ボットを開始する",
  "command.link": "このチャットを NexusAI アカウントに連携する",
  "command.unlink": "このチャットと NexusAI アカウントの連携を解除する",
  "command.whoami": "このチャットがどのアカウントとして動作しているか表示する",
  "command.switch": "ワークスペースまたはスレッドを切り替える",
  "command.workspaces": "アクセスできるワークスペースを一覧表示する",
  "command.language": "アシスタントが返答する言語を選ぶ",
  "command.menu": "ボタンバーを表示する (/menu off で非表示)",
  "command.model": "LLM モデルを変更する",
  "command.new": "新しいスレッドを開始する",
  "command.history": "最近のメッセージを表示する (例: /history 25)",
  "command.status": "現在のワークスペースとモデルを表示する",
  "command.reset": "現在のスレッドのチャット履歴をクリアする",
  "command.help": "利用できるコマンドを表示する",
  "command.proof": "直前の返答の引用を表示する",
  "command.abort": "実行中の返答を停止する",
};
