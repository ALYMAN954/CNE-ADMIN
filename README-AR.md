# CNE Admin: أيقونة واحدة، ملفان منفصلان (الحضور والتقييم)

تفتح الأيقونة صفحة فيها خياران: **Attendance** و**Evaluation**.
- كل خيار يطلب كلمة سر قسمه فقط، ثم يعرض ملف ذلك القسم وحده: قائمة المحاضرات، الأعداد، الجدول، بحث، وتنزيل Excel.
- لا يوجد أي دمج بين الحضور والتقييم، وكل ملف Excel يخص قسمه فقط.
- زرا "Download this lecture" (المحاضرة المختارة) و"Download all lectures" (كل المحاضرات، تبويب لكل محاضرة).
- أسفل كل قسم رابط "Open admin panel" لتغيير الإعدادات وفتح/إغلاق النموذج، ورابط "View the form".

## قبل الرفع: حدّث سكربتي Google (مهم، وإلا ستظهر رسالة "not been updated")
### التقييم
1. Apps Script الخاص بالتقييم: افتح `Code.gs` والصق الملف الجديد (من `cne-evaluation-report-update.zip`).
2. أعد كتابة `ADMIN_PASSWORD` الخاصة بك.
3. Deploy > Manage deployments > Edit > Version: New version > Deploy.
### الحضور
1. Apps Script الخاص بالحضور: افتح `Code.gs` والصق `Code.gs` الجديد (من `cne-attendance-Code.gs`).
2. غيّر `ADMIN_PASSWORD` من `CHANGE_ME` إلى كلمتك.
3. Deploy > Manage deployments > Edit > New version > Deploy.
(الرابط لا يتغير في الحالتين.)

## رفع صفحة الأيقونة
1. GitHub: مشروع `CNE-Admin` (Public)، ارفع كل محتويات المجلد (`index.html`, `app.js`, `xlsx.js`, `config.js`, `manifest.webmanifest`, `icons/`, `assets/`).
2. Settings > Pages > main / root.
3. الرابط: `https://alyman954.github.io/CNE-Admin/`

## الإضافة للشاشة الرئيسية
- آيفون (Safari): المشاركة > Add to Home Screen.
- أندرويد (Chrome): القائمة ⋮ > Add to Home screen.

## ملاحظات
- كلمة السر تبقى في الجلسة فقط، وتُرسل إلى سكربت Google نفسه كما تفعل لوحتا المشرف.
- الصفحة نفسها لا تحتوي كلمة سر ولا بيانات؛ البيانات تظهر بعد الدخول فقط.
- لتغيير أي رابط لاحقا عدّل `config.js`.

---

## شاشة الرمز (QR) للقاعة

صفحتان جاهزتان للعرض على التلفاز أو البروجكتر (مجلد `screen`):
- الحضور: `https://alyman954.github.io/CNE-Admin/screen/attendance.html`
- التقييم: `https://alyman954.github.io/CNE-Admin/screen/evaluation.html`

كل صفحة تعرض رمزا دائما لا ينتهي (رابط النموذج الثابت) وفي وسطه شعار المستشفى. يُنسخ **اسم المحاضرة** (بالذهبي) و**اسم المحاضر** (بالتركوازي) تلقائيا من إعدادات **لوحة الحضور**، ويتحدثان خلال دقيقة بعد حفظ التغيير في لوحة الحضور. للصفحتين نفس الأسماء.

- افتح الرابط على جهاز القاعة واضغط F11 لملء الشاشة. تتناسب مع أي شاشة تلقائيا.
- إن انقطع الإنترنت تبقى آخر أسماء معروضة.
- من صفحة الأيقونة: داخل كل قسم رابط "Open the QR screen for the hall".

### للطباعة
- `qr-attendance-print.png` و`qr-evaluation-print.png` (دقة عالية) و`.svg` لكل منهما داخل مجلد `screen`.
