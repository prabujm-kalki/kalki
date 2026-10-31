import { db } from "@/db";
import { userManualSections } from "@/db/schema";
import { sql } from "drizzle-orm";

export const PURCHASING_MANUAL_DATA = [
  {
    module: "purchasing",
    submodule: "overview",
    slug: "purchasing-introduction",
    titleEn: "1. Introduction to Purchasing & 3-Way Matching",
    titleTa: "1. கொள்முதல் அறிமுகம் மற்றும் 3-வழி சரிபார்ப்பு (3-Way Matching)",
    titleHi: "1. खरीद परिचय और 3-वे मिलान (3-Way Matching)",
    summaryEn: "Learn the core philosophy of purchasing in Kalki BOS, why every rupee spent must be verified, and how the 3-way match protects business profits.",
    summaryTa: "கல்கி BOS-ல் கொள்முதலின் அடிப்படைக் கொள்கை, செலவிடப்படும் ஒவ்வொரு ரூபாயும் எவ்வாறு கண்காணிக்கப்படுகிறது மற்றும் 3-வழி சரிபார்ப்பு எவ்வாறு லாபத்தைப் பாதுகாக்கிறது என்பதை அறிக.",
    summaryHi: "कल्कि बीओएस में खरीद का मूल दर्शन समझें, हर खर्च का सत्यापन क्यों जरूरी है और 3-वे मिलान व्यापारिक लाभ की सुरक्षा कैसे करता है।",
    contentEn: `### Welcome to Kalki BOS Purchasing

Purchasing is the heartbeat of our restaurant and department store operations. Every raw vegetable, grocery bag, meat portion, and packaging box you buy directly affects our product quality and business profits.

#### The Golden Rule: 3-Way Matching
To prevent duplicate payments, supplier overbilling, and lost items, Kalki BOS follows an automated **3-Way Matching System**:

1. **Purchase Order (PO)**: What we agreed to buy from the vendor, at what rate, and delivery date.
2. **Goods Receipt Note (GRN)**: What was physically weighed, counted, inspected, and received at the store gate.
3. **Vendor Bill / Invoice**: The final bill sent by the vendor requesting payment.

Kalki BOS automatically cross-checks all three. If a vendor bills for 50 kg but our store gate received only 45 kg, the system immediately catches the discrepancy and adjusts the payable amount!`,
    contentTa: `### கல்கி BOS கொள்முதல் தொகுதிக்கு வரவேற்கிறோம்

கொள்முதல் என்பது நமது உணவகம் மற்றும் டிபார்ட்மென்ட் ஸ்டோர் செயல்பாடுகளின் உயிர்நாடியாகும். நீங்கள் வாங்கும் ஒவ்வொரு காய்கறி, மளிகைப் பொருட்கள், இறைச்சி மற்றும் பேக்கிங் பொருட்கள் நமது தயாரிப்புத் தரம் மற்றும் லாபத்தை நேரடியாகத் தீர்மானிக்கின்றன.

#### பொன்னான விதி: 3-வழி சரிபார்ப்பு (3-Way Matching)
இரட்டைப் பணம் செலுத்துதல், சப்ளையர் அதிக கட்டணம் வசூலிப்பது மற்றும் பொருள் இழப்பைத் தடுக்க, கல்கி BOS தானியங்கி **3-வழி சரிபார்ப்பு முறையை** பின்பற்றுகிறது:

1. **கொள்முதல் ஆணை (PO)**: சப்ளையரிடமிருந்து என்ன விலை, என்ன அளவு வாங்க ஒப்புக்கொண்டோம் என்ற பதிவு.
2. **பொருள் ஏற்புச் சீட்டு (GRN)**: கடையில் எடைபோட்டு, தரம் பார்த்து பெற்றுக் கொண்ட உண்மையான அளவு.
3. **விற்பனையாளர் பில் (Vendor Bill)**: பணம் கேட்டு சப்ளையர் அனுப்பிய இறுதி பில்.

இந்த மூன்றையும் கல்கி BOS தானாக ஒப்பிட்டுச் சரிபார்க்கிறது. சப்ளையர் 50 கிலோவுக்கு பில் போட்டிருந்தாலும், நமது கடையில் 45 கிலோ மட்டுமே எடை வந்திருந்தால், சிஸ்டம் உடனே 5 கிலோவின் தொகையைக் கழித்து விடும்!`,
    contentHi: `### कल्कि बीओएस खरीद मॉड्यूल में आपका स्वागत है

खरीद हमारे रेस्तरां और डिपार्टमेंट स्टोर संचालन की रीढ़ है। आपके द्वारा खरीदी जाने वाली हर सब्जी, किराना सामग्री, मांस और पैकेजिंग उत्पाद सीधे उत्पाद की गुणवत्ता और मुनाफे को प्रभावित करती है।

#### सुनहरा नियम: 3-वे मिलान (3-Way Matching)
गलत भुगतान, अधिक बिलिंग और माल के नुकसान को रोकने के लिए, कल्कि बीओएस एक स्वचालित **3-वे मिलान प्रणाली** का उपयोग करता है:

1. **खरीद आदेश (PO)**: हमने सप्लायर से किस दर और मात्रा पर सामान तय किया।
2. **माल प्राप्ति रसीद (GRN)**: दुकान के गेट पर वास्तव में क्या तोला, जांचा और प्राप्त किया गया।
3. **सप्लायर बिल (Vendor Invoice)**: भुगतान के लिए सप्लायर द्वारा भेजा गया बिल।

कल्कि बीओएस इन तीनों की स्वचालित तुलना करता है। यदि सप्लायर 50 किलो का बिल देता है लेकिन दुकान पर केवल 45 किलो मिला, तो सिस्टम तुरंत शेष राशि काट लेता है!`,
    examplesEn: `**Real Example**: 
Chef orders 20 kg Paneer at ₹300/kg (Total ₹6,000). 
Supplier delivers 18 kg due to stock shortage. 
Store receiver enters 18 kg in Goods Receipt. 
When the vendor bill arrives for ₹6,000, Kalki BOS flags it and approves payment only for ₹5,400 (18 kg × ₹300). The store saves ₹600 without manual argument!`,
    examplesTa: `**நடைமுறை உதாரணம்**:
தலைமை சமையலர் 20 கிலோ பன்னீர் ₹300/கிலோ விலையில் ஆர்டர் செய்தார் (மொத்தம் ₹6,000).
சப்ளையர் கையிருப்புக் குறைவால் 18 கிலோ மட்டுமே கொண்டு வந்தார்.
கடை ஊழியர் GRN-ல் 18 கிலோ எனப் பதிவிடுகிறார்.
சப்ளையர் பழையபடி ₹6,000-க்கு பில் அனுப்பினால், கல்கி BOS அதைத் தடுத்து, சரியான 18 கிலோவுக்கான ₹5,400 மட்டுமே வழங்கும். இதனால் கடைக்கு ₹600 மிச்சம்!`,
    examplesHi: `**व्यावहारिक उदाहरण**:
शेफ ने ₹300/किलो पर 20 किलो पनीर ऑर्डर किया (कुल ₹6,000)।
सप्लायर ने केवल 18 किलो दिया।
रिसीवर ने GRN में 18 किलो दर्ज किया।
जब सप्लायर ₹6,000 का बिल देता है, तो कल्कि बीओएस केवल ₹5,400 (18 किलो × ₹300) का भुगतान ही स्वीकृत करता है। इससे ₹600 की सीधी बचत होती है!`,
    faqJson: [
      {
        qEn: "What is 3-Way Matching?",
        qTa: "3-வழி சரிபார்ப்பு என்றால் என்ன?",
        qHi: "3-वे मिलान क्या है?",
        aEn: "It automatically verifies the Purchase Order, Goods Received (GRN), and Vendor Bill before issuing payment.",
        aTa: "பணம் செலுத்தும் முன் PO, பெற்றுக் கொண்ட அளவு (GRN) மற்றும் விற்பனையாளர் பில் ஆகிய மூன்றையும் ஒப்பிட்டுச் சரிபார்க்கும் முறை.",
        aHi: "भुगतान करने से पहले खरीद आदेश (PO), प्राप्त माल (GRN) और विक्रेता बिल का स्वतः मिलान करना।"
      }
    ],
    targetRoles: ["ALL"],
    isKpiLinked: true,
    orderIndex: 1
  },
  {
    module: "purchasing",
    submodule: "items",
    slug: "items-master-uom",
    titleEn: "2. Items Master & Unit of Measure (UOM)",
    titleTa: "2. பொருட்கள் பட்டியல் மற்றும் அளவீட்டு அலகுகள் (UOM)",
    titleHi: "2. उत्पाद मास्टर और मापन इकाइयाँ (UOM)",
    summaryEn: "Understanding item codes, category classification, tax slabs, and the vital difference between Purchasing UOM and Stock UOM.",
    summaryTa: "பொருள் குறியீடுகள், வகைப்பாடுகள், ஜிஎஸ்டி வரிகள் மற்றும் வாங்கும் அலகுக்கும் இருப்பு அலகுக்கும் இடையிலான வேறுபாடுகளைப் புரிந்து கொள்ளுதல்.",
    summaryHi: "आइटम कोड, वर्गीकरण, टैक्स स्लैब और खरीद इकाई बनाम स्टॉक इकाई के अंतर को समझें।",
    contentEn: `### Master Items & Measurement Units

Every material used in our kitchen or sold in our store must exist in the **Items Catalog**.

#### Key Concept: Purchase UOM vs. Inventory UOM
Often, how we buy an item from a wholesale vendor is different from how the kitchen or store uses it:

- **Purchasing UOM**: How the supplier packages and sells it (e.g., Tin, Sack, Bag, Box, Crate).
- **Stock / Kitchen UOM**: How our chefs consume it (e.g., Litre, Kilogram, Gram, Pieces).

**Conversion Factor**: 
When you configure 1 Tin of Sunflower Oil = 15 Litres, Kalki BOS automatically converts bulk supplier deliveries into accurate kitchen recipe stock!`,
    contentTa: `### பொருட்கள் பட்டியல் மற்றும் அளவீடுகள்

நமது சமையலறையில் பயன்படுத்தப்படும் அல்லது விற்பனை செய்யப்படும் அனைத்துப் பொருட்களும் **பொருட்கள் பட்டியலில் (Items Catalog)** பதிவு செய்யப்பட்டிருக்க வேண்டும்.

#### முக்கிய கருத்து: வாங்கும் அலகு (Purchase UOM) vs இருப்பு அலகு (Stock UOM)
மொத்த வியாபாரியிடமிருந்து நாம் வாங்கும் பேக்கிங் முறைக்கும், சமையலறையில் பயன்படுத்தும் முறைக்கும் வேறுபாடு இருக்கும்:

- **வாங்கும் அலகு (Purchase UOM)**: சப்ளையர் விற்கும் வடிவம் (டின், மூட்டை, அட்டைப்பெட்டி, பை).
- **இருப்பு அலகு (Stock UOM)**: சமையலறையில் சமையலுக்குப் பயன்படும் அளவு (லிட்டர், கிலோகிராம், கிராம், எண்ணிக்கை).

**மாற்று விகிதம் (Conversion Factor)**:
1 டின் சூரியகாந்தி எண்ணெய் = 15 லிட்டர் என அமைத்தால், சப்ளையர் கொண்டு வரும் டின்களை சிஸ்டம் தானாகவே லிட்டர்களாக மாற்றி சமையல் இருப்புக்குச் சேர்க்கும்!`,
    contentHi: `### उत्पाद मास्टर और मापन इकाइयाँ

हमारे रेस्तरां या स्टोर में उपयोग होने वाली प्रत्येक वस्तु **आइटम कैटलॉग** में होनी चाहिए।

#### मुख्य अवधारणा: खरीद इकाई बनाम स्टॉक इकाई
थोक विक्रेता से माल खरीदने का तरीका और रसोई में उसके उपयोग का तरीका अक्सर अलग होता है:

- **खरीद इकाई (Purchase UOM)**: सप्लायर किस पैकिंग में बेचता है (जैसे टिन, बोरी, क्रेट, बॉक्स)।
- **स्टॉक इकाई (Stock UOM)**: रसोई में किस माप में खर्च होता है (जैसे लीटर, किलोग्राम, ग्राम)।

**रूपांतरण दर (Conversion)**:
यदि आप 1 टिन तेल = 15 लीटर सेट करते हैं, तो कल्कि बीओएस थोक टिन को स्वचालित रूप से स्टॉक में लीटर में जोड़ देता है!`,
    examplesEn: `**Example**: 
Buying Basmati Rice in a 25 kg Bag. 
Purchase Unit = BAG. Stock Unit = KG. Multiplier = 25. 
When 4 bags are received, stock automatically increases by 100 kg.`,
    examplesTa: `**உதாரணம்**:
25 கிலோ பாசுமதி அரிசி மூட்டை வாங்குதல்.
Purchase Unit = BAG. Stock Unit = KG. Multiplier = 25.
4 மூட்டைகள் கடைக்குள் வரும்போது, தானாகவே 100 கிலோ இருப்பு ஏறும்.`,
    examplesHi: `**उदाहरण**:
25 किलो बासमती चावल की बोरी खरीदना।
Purchase Unit = BAG, Stock Unit = KG, Multiplier = 25।
4 बोरियां प्राप्त होने पर स्टॉक में स्वतः 100 किलो जुड़ जाता है।`,
    faqJson: [
      {
        qEn: "Can I change an item's Stock UOM after receiving stock?",
        qTa: "சரக்கு பெற்ற பிறகு Stock UOM-ஐ மாற்ற முடியுமா?",
        qHi: "क्या स्टॉक प्राप्त करने के बाद स्टॉक इकाई बदल सकते हैं?",
        aEn: "No. Stock UOM is fixed once transactions exist to preserve ledger accuracy. Create a new item if units change permanently.",
        aTa: "முடியாது. கணக்கு துல்லியத்திற்காக Stock UOM மாற்ற முடியாது. தேவைப்பட்டால் புதிய பொருளை உருவாக்கவும்.",
        aHi: "नहीं। बहीखाते की सटीकता के लिए स्टॉक इकाई नहीं बदली जा सकती। स्थायी बदलाव के लिए नया आइटम बनाएं।"
      }
    ],
    targetRoles: ["ALL"],
    isKpiLinked: true,
    orderIndex: 2
  },
  {
    module: "purchasing",
    submodule: "purchase-orders",
    slug: "creating-purchase-orders",
    titleEn: "3. Creating & Managing Purchase Orders (PO)",
    titleTa: "3. கொள்முதல் ஆணை (PO) உருவாக்குதல் மற்றும் நிர்வகித்தல்",
    titleHi: "3. खरीद आदेश (PO) बनाना और प्रबंधित करना",
    summaryEn: "How to draft, verify pricing, approve within authorization limits, and dispatch official POs to vendors via WhatsApp and PDF.",
    summaryTa: "கொள்முதல் ஆணையை உருவாக்குதல், விலை சரிபார்த்தல், அனுமதி வரம்புகளுக்குள் ஒப்புதல் பெறுதல் மற்றும் வாட்ஸ்அப் வழியாக விற்பனையாளருக்கு அனுப்புதல்.",
    summaryHi: "खरीद आदेश तैयार करना, मूल्य सत्यापन, अनुमोदन सीमाओं के तहत स्वीकृति और व्हाट्सएप/पीडीएफ द्वारा सप्लायर को भेजना।",
    contentEn: `### Creating a Purchase Order (PO)

A Purchase Order is our official business commitment to a vendor. Never order goods informally via phone call without generating a PO in Kalki BOS!

#### Step-by-Step Procedure:
1. Navigate to **Purchasing → Purchase Orders → Create PO**.
2. Select the **Vendor / Supplier** and specify the **Expected Delivery Date & Time**.
3. Add the required items, verifying the negotiated unit rate.
4. Review total estimated cost including GST.
5. Click **Submit for Approval** or **Approve & Dispatch**.

#### Automatic WhatsApp Dispatch:
Once approved, Kalki BOS immediately generates a formal digital PO document and dispatches it directly to the vendor's registered WhatsApp number with delivery specifications!`,
    contentTa: `### கொள்முதல் ஆணை (PO) உருவாக்கும் முறை

கொள்முதல் ஆணை என்பது சப்ளையருக்கு நாம் வழங்கும் முறையான வணிக உறுதிமொழி. கல்கி BOS-ல் PO உருவாக்காமல் போனில் வாய்மொழியாக ஆர்டர் செய்யக்கூடாது!

#### படி படியான செயல்முறை:
1. **Purchasing → Purchase Orders → Create PO** பகுதிக்குச் செல்லவும்.
2. **சப்ளையரைத் தேர்வு செய்து**, பொருள் வந்து சேர வேண்டிய **தேதி மற்றும் நேரத்தைக்** குறிப்பிடவும்.
3. தேவையான பொருட்களைச் சேர்த்து, ஒப்புக்கொள்ளப்பட்ட விலையைச் சரிபார்க்கவும்.
4. ஜிஎஸ்டி வரியுடன் கூடிய மொத்தத் தொகையை சரிபார்க்கவும்.
5. **Approve & Dispatch** பட்டனை அழுத்தவும்.

#### தானியங்கி வாட்ஸ்அப் செய்தி:
ஒப்புதல் அளிக்கப்பட்டதும், கல்கி BOS தானாகவே அதிகாரப்பூர்வ PO ஆவணத்தை சப்ளையரின் வாட்ஸ்அப் எண்ணிற்கு உடனடியாக அனுப்பிவிடும்!`,
    contentHi: `### खरीद आदेश (PO) बनाने की प्रक्रिया

खरीद आदेश सप्लायर के प्रति हमारी आधिकारिक व्यावसायिक प्रतिबद्धता है। फोन पर मौखिक रूप से बिना PO बनाए कभी भी सामान का ऑर्डर न दें!

#### चरण-दर-चरण प्रक्रिया:
1. **Purchasing → Purchase Orders → Create PO** पर जाएं।
2. **सप्लायर चुनें** और डिलीवरी की **तारीख व समय** दर्ज करें।
3. आवश्यक आइटम जोड़ें और तय की गई दर की जांच करें।
4. टैक्स सहित कुल राशि की समीक्षा करें।
5. **Approve & Dispatch** पर क्लिक करें।

#### स्वचालित व्हाट्सएप प्रेषण:
स्वीकृत होते ही, सिस्टम स्वचालित रूप से एक औपचारिक पीओ दस्तावेज़ बनाकर सप्लायर के पंजीकृत व्हाट्सएप नंबर पर भेज देता है!`,
    examplesEn: `**Tip**: 
Always verify that the expected delivery time is set before store opening hours (e.g., before 7:00 AM for fresh milk & vegetables) so the kitchen team is never left waiting.`,
    examplesTa: `**முக்கிய குறிப்பு**:
கடை திறக்கும் நேரத்திற்கு முன்பாகவே பொருட்கள் வந்து சேரும் நேரத்தை (எ.கா. பால் மற்றும் காய்கறிகளுக்கு காலை 7:00 மணிக்குள்) அமைக்க வேண்டும். இதனால் சமையல் தாமதமாகாது.`,
    examplesHi: `**महत्वपूर्ण टिप**:
हमेशा ध्यान दें कि डिलीवरी का समय दुकान खुलने से पहले का हो (जैसे सुबह 7:00 बजे से पहले), ताकि रसोई का काम समय पर शुरू हो सके।`,
    faqJson: [
      {
        qEn: "Can I cancel a Purchase Order after dispatch?",
        qTa: "அனுப்பிய பிறகு PO-வை ரத்து செய்ய முடியுமா?",
        qHi: "क्या भेजने के बाद पीओ रद्द किया जा सकता है?",
        aEn: "Yes, provided goods have not yet been received at the gate. Inform the vendor and click 'Void / Cancel PO'.",
        aTa: "ஆம், சரக்கு கடைக்கு வந்து சேரும் முன் ரத்து செய்யலாம். சப்ளையருக்கு தெரிவித்துவிட்டு 'Cancel' செய்யவும்.",
        aHi: "हाँ, बशर्ते माल अभी तक गेट पर प्राप्त न हुआ हो। सप्लायर को सूचित करें और रद्द करें।"
      }
    ],
    targetRoles: ["ALL"],
    isKpiLinked: true,
    orderIndex: 3
  },
  {
    module: "purchasing",
    submodule: "receive",
    slug: "goods-receiving-grn",
    titleEn: "4. Goods Receiving (GRN) & Gate Quality Check",
    titleTa: "4. பொருள் ஏற்புச் சீட்டு (GRN) மற்றும் தரக் கட்டுப்பாடு",
    titleHi: "4. माल प्राप्ति (GRN) और गुणवत्ता जांच",
    summaryEn: "How gate receivers weigh goods, log physical quantities, reject spoiled items, and complete the official Goods Receipt Note.",
    summaryTa: "கடை நுழைவாயிலில் எடையிடுதல், உண்மையான அளவைப் பதிவு செய்தல், சேதமடைந்த பொருட்களை நிராகரித்தல் மற்றும் GRN உருவாக்குதல்.",
    summaryHi: "गेट पर सामान का वजन करना, वास्तविक मात्रा दर्ज करना, खराब सामान वापस करना और जीआरएन पूरा करना।",
    contentEn: `### Goods Receiving (GRN) at the Gate

The store receiving counter is our primary defensive gate against losses. 

#### Essential Receiving Rules:
1. **Always Weigh on Scale**: Never accept handwritten delivery slips without putting boxes on the weighing scale.
2. **Check Quality First**: Fresh vegetables, paneer, and milk must be checked for freshness and smell before accepting.
3. **Log Exact Received Quantity**: If 20 kg was ordered but only 18.2 kg is physically received, enter **18.2 kg** in Kalki BOS.
4. **Reject Spoiled Stock**: If 2 kg of tomatoes are rotten, mark 2 kg as **REJECTED** with photos. The vendor bill will automatically be adjusted!`,
    contentTa: `### கடை நுழைவாயிலில் சரக்கு ஏற்பு (GRN)

கடையின் சரக்கு பெறும் இடம் தான் நமது நிறுவனத்தின் பண இழப்பைத் தடுக்கும் மிக முக்கிய பாதுகாப்புக் கோட்டையாகும்.

#### கட்டாய விதிமுறைகள்:
1. **எடைபோட்டு மட்டுமே வாங்கவும்**: சப்ளையர் பில்லில் எழுதியிருப்பதை கண்மூடித்தனமாக நம்பாமல் எலக்ட்ரானிக் எடை மெஷினில் வைத்து சரிபார்க்கவும்.
2. **தரத்தை முதலில் சோதிக்கவும்**: பால், பன்னீர், காய்கறி போன்றவற்றை நுகர்ந்து பார்த்து, புத்துணர்ச்சியை உறுதி செய்த பின்பே ஏற்கவும்.
3. **உண்மையான எடையை மட்டும் பதிவு செய்யவும்**: 20 கிலோ ஆர்டர் செய்யப்பட்டு 18.2 கிலோ மட்டுமே வந்தால், கல்கி BOS-ல் **18.2 கிலோ** என்றே உள்ளிட வேண்டும்.
4. **சேதமடைந்ததை நிராகரிக்கவும்**: தக்காளி அழுகியிருந்தால் அதை உடனே **Rejected** எனப் பதிவு செய்யவும். பில்லில் அந்தத் தொகை தானாகவே கழிந்துவிடும்!`,
    contentHi: `### गेट पर माल प्राप्ति (GRN) के नियम

दुकान का रिसीविंग काउंटर नुकसान से बचने की सबसे पहली सुरक्षा दीवार है।

#### आवश्यक प्राप्ति नियम:
1. **हमेशा तौल कर लें**: सप्लायर की पर्ची पर भरोसा न करें, इलेक्ट्रॉनिक कांटे पर वजन जरूर करें।
2. **गुणवत्ता पहले जांचें**: दूध, पनीर और सब्जियों की ताजगी और गंध की जांच के बाद ही स्वीकार करें।
3. **वास्तविक वजन ही लिखें**: यदि 20 किलो में से केवल 18.2 किलो आया है, तो सिस्टम में **18.2 किलो** ही दर्ज करें।
4. **खराब माल अस्वीकार करें**: यदि सब्जी सड़ी हुई है, तो उसे 'Rejected' दर्ज करें। इसका पैसा बिल से अपने आप कट जाएगा!`,
    examplesEn: `**Discrepancy Resolution**:
Ordered 50 Coconuts. Supplier brought 50, but 6 were cracked/spoiled.
Gate receiver accepts 44, rejects 6.
Kalki BOS automatically recalculates the bill for 44 coconuts only.`,
    examplesTa: `**உதாரணம்**:
50 தேங்காய் ஆர்டர் செய்யப்பட்டது. சப்ளையர் 50 கொண்டு வந்தார், ஆனால் 6 தேங்காய் அழுகி உடைந்து இருந்தது.
ஊழியர் 44 தேங்காய்களை ஏற்றுக்கொண்டு 6-ஐ நிராகரிக்கிறார்.
கல்கி BOS தானாகவே 44 தேங்காய்க்கு மட்டுமே பணத்தை அனுமதிக்கும்.`,
    examplesHi: `**उदाहरण**:
50 नारियल ऑर्डर किए गए। 6 नारियल खराब निकले।
रिसीवर 44 स्वीकार करता है और 6 अस्वीकार करता है।
सिस्टम केवल 44 नारियल का भुगतान तैयार करता है।`,
    faqJson: [
      {
        qEn: "Can I receive goods without an approved PO?",
        qTa: "அங்கீகரிக்கப்பட்ட PO இல்லாமல் சரக்கு எடுக்க முடியுமா?",
        qHi: "क्या बिना स्वीकृत पीओ के माल प्राप्त किया जा सकता है?",
        aEn: "Emergency items should be handled via Cashier Spot Purchase. Regular supplier goods must be linked to a PO.",
        aTa: "அவசரப் பொருட்களை Cashier Spot Purchase மூலம் வாங்கலாம். வழக்கமான பொருட்களுக்கு PO கட்டாயம் இருக்க வேண்டும்.",
        aHi: "आपातकालीन सामान कैशियर स्पॉट परचेज से लें। नियमित सप्लायर के लिए पीओ जरूरी है।"
      }
    ],
    targetRoles: ["ALL"],
    isKpiLinked: true,
    orderIndex: 4
  },
  {
    module: "purchasing",
    submodule: "cashier",
    slug: "cashier-spot-purchase",
    titleEn: "5. Cashier Spot Purchases (Emergency Buys)",
    titleTa: "5. காசாளர் அவசரக் கொள்முதல் (Cashier Spot Purchase)",
    titleHi: "5. कैशियर स्पॉट परचेज (आपातकालीन खरीद)",
    summaryEn: "How store cashiers record emergency local market buys, upload bill photos, and track petty cash disbursements.",
    summaryTa: "உள்ளூர் சந்தையில் அவசரமாக வாங்கும் பொருட்கள், ரசீது புகைப்படம் பதிவேற்றம் மற்றும் சில்லறைப் பணக் கணக்கு நிர்வகித்தல்.",
    summaryHi: "स्थानीय बाजार से आपातकालीन खरीद, बिल की फोटो अपलोड और पेटी कैश का हिसाब रखना।",
    contentEn: `### Cashier Spot Purchase Module

During busy rush hours, the kitchen may unexpectedly run out of critical ingredients (e.g., fresh coriander, lemons, or cylinder gas). 

Instead of waiting for regular wholesale PO delivery, the Cashier can make an **emergency spot purchase** using Petty Cash or UPI.

#### Steps for Cashiers:
1. Go to **Purchasing → Spot Purchase**.
2. Select the item from catalog and enter the local shop vendor name.
3. Enter exact quantity bought and total amount paid.
4. Take a **clear smartphone photo of the cash receipt / hand slip**.
5. Submit voucher. The store manager can audit and clear the voucher instantly!`,
    contentTa: `### காசாளர் அவசரக் கொள்முதல் (Spot Purchase)

கூட்டம் அதிகமாக இருக்கும் நேரங்களில் சமையலறையில் எலுமிச்சம்பழம், கொத்தமல்லி அல்லது கேஸ் சிலிண்டர் போன்ற அவசியப் பொருட்கள் திடீரெனத் தீர்ந்து போகலாம்.

வழக்கமான சப்ளையருக்காகக் காத்திருக்காமல், காசாளர் பெட்டி கேஷ் (Petty Cash) அல்லது UPI மூலம் உடனடியாக உள்ளூர் கடைகளில் வாங்கலாம்.

#### காசாளர் செய்ய வேண்டியவை:
1. **Purchasing → Spot Purchase** பகுதிக்குச் செல்லவும்.
2. பொருளின் பெயரைத் தேர்வு செய்து, வாங்கிய கடையின் பெயரை எழுதவும்.
3. வாங்கிய அளவு மற்றும் செலுத்திய தொகையை உள்ளிடவும்.
4. **ரசீதை செல்போனில் தெளிவாகப் படம் எடுத்து பதிவேற்றவும்**.
5. சமர்ப்பிக்கவும். மேலாளர் உடனே சரிபார்த்து பெட்டி கேஷ் கணக்கை சரிசெய்வார்!`,
    contentHi: `### कैशियर स्पॉट परचेज (आपातकालीन खरीद)

दुकान में भीड़ के समय कभी-कभी अचानक धनिया, नींबू या गैस जैसी आवश्यक चीजें खत्म हो जाती हैं।

थोक सप्लायर का इंतजार किए बिना, कैशियर पेटी कैश या यूपीआई से तुरंत स्थानीय बाजार से खरीद सकता है।

#### कैशियर के लिए चरण:
1. **Purchasing → Spot Purchase** पर जाएं।
2. आइटम चुनें और स्थानीय दुकानदार का नाम लिखें।
3. खरीदी गई मात्रा और भुगतान की गई राशि दर्ज करें।
4. **रसीद या पर्ची का साफ फोटो खींचकर अपलोड करें**।
5. सबमिट करें। स्टोर मैनेजर तुरंत वाउचर ऑडिट करके पेटी कैश पास कर देगा!`,
    examplesEn: `**Example**:
Sudden rush on Sunday lunch. Chef needs 2 kg Coriander leaves urgently.
Cashier pays ₹120 from drawer, buys from nearby vendor, snaps photo of slip, and logs voucher #SP-042. Complete audit trail in 60 seconds!`,
    examplesTa: `**உதாரணம்**:
ஞாயிறு மதிய வேளையில் 2 கிலோ கொத்தமல்லி அவசரமாகத் தேவைப்படுகிறது.
காசாளர் கல்லாப்பெட்டியிலிருந்து ₹120 கொடுத்து வாங்கி, ரசீதை படம் எடுத்து SP-042 எனப் பதிவு செய்கிறார். 1 நிமிடத்தில் கணக்கு முடிந்தது!`,
    examplesHi: `**उदाहरण**:
रविवार दोपहर को अचानक 2 किलो हरे धनिए की जरूरत पड़ी।
कैशियर ने ₹120 देकर पास की दुकान से खरीदा, पर्ची की फोटो ली और वाउचर दर्ज किया। 1 मिनट में पूरा हिसाब दर्ज!`,
    faqJson: [
      {
        qEn: "What if the local vendor does not give a printed receipt?",
        qTa: "உள்ளூர் வியாபாரி ரசீது தரவில்லை என்றால் என்ன செய்வது?",
        qHi: "यदि दुकानदार रसीद न दे तो क्या करें?",
        aEn: "Write the details on a store petty cash voucher slip, get cashier and receiver signature, and upload its photo.",
        aTa: "கடையின் சில்லறைப் பண வவுச்சரில் விபரங்களை எழுதி, கையொப்பமிட்டு அந்த சீட்டை புகைப்படம் எடுத்து பதிவேற்றவும்.",
        aHi: "स्टोर की पेटी कैश पर्ची पर विवरण लिखकर हस्ताक्षर करें और उसकी फोटो अपलोड करें।"
      }
    ],
    targetRoles: ["ALL", "CASHIER"],
    isKpiLinked: true,
    orderIndex: 5
  },
  {
    module: "purchasing",
    submodule: "kitchen-sop",
    slug: "kitchen-refrigeration-sop",
    titleEn: "6. Role-Based SOP: Kitchen Cold Storage & Freezer Standards",
    titleTa: "6. சமையலறை குளிர்சாதனப் பெட்டி மற்றும் ஃப்ரீசர் பராமரிப்பு SOP",
    titleHi: "6. रसोई शीत भंडारण और डीप-फ्रीजर मानक (Kitchen SOP)",
    summaryEn: "Critical food safety standards for kitchen helpers and chefs: temperature thresholds, FIFO stock rotation, and hygiene checklists.",
    summaryTa: "உணவுப் பாதுகாப்பு மற்றும் தரக்கட்டுப்பாடு: குளிர்சாதன வெப்பநிலை, FIFO சரக்கு சுழற்சி மற்றும் தூய்மை விதிகள்.",
    summaryHi: "खाद्य सुरक्षा और गुणवत्ता मानक: तापमान सीमा, फीफो (FIFO) स्टॉक चक्र और सफाई नियम।",
    contentEn: `### Kitchen Cold Storage & Deep-Freezer SOP

Food safety and zero waste depend on how well our kitchen team operates our chillers and freezers.

#### 1. Temperature Guidelines
- **Walk-in Chiller / Raw Fridge**: **+2°C to +4°C** (Milk, Dairy, Cut Vegetables, Batter, Sauces).
- **Deep Freezer**: **-18°C or below** (Raw Chicken, Meat, Frozen Seafood, Ice Creams).

#### 2. The First-In, First-Out (FIFO) Rule
- Always place newly received stock **behind** existing stock.
- Use older stock first before opening new crates or packaging.
- Every prepped container must have a date label!

#### 3. Cross-Contamination Prevention
- Never store raw meat above cooked food or dairy.
- Keep all containers covered with food-grade lids or cling wrap.`,
    contentTa: `### சமையலறை குளிர்சாதனப் பெட்டி மற்றும் ஃப்ரீசர் SOP

உணவுப் பாதுகாப்பு மற்றும் வீணாவதைத் தடுப்பது சமையலறை ஊழியர்கள் ஃப்ரீசர்களை முறையாகப் பராமரிப்பதில்தான் உள்ளது.

#### 1. வெப்பநிலை விதிமுறைகள்:
- **சாதாரண குளிர்சாதனப் பெட்டி (Chiller)**: **+2°C முதல் +4°C வரை** (பால், காய்கறிகள், இட்லி மாவு, கிரேவி).
- **டீப் ஃப்ரீசர் (Deep Freezer)**: **-18°C அல்லது அதற்கும் கீழ்** (இறைச்சி, சிக்கன், மீன், ஐஸ்கிரீம்).

#### 2. FIFO விதிமுறை (முதலில் வந்தது முதலில் பயன்பாடு):
- புதிதாக வரும் பொருட்களை எப்போதுமே பழைய பொருட்களுக்கு **பின்னால்** அடுக்க வேண்டும்.
- பழைய பொருட்களை முதலில் சமையலுக்குப் பயன்படுத்த வேண்டும்.
- நறுக்கிய காய்கறி டப்பாக்களில் தேதி குறிக்கப்பட்டிருக்க வேண்டும்!

#### 3. தூய்மைப் பாதுகாப்பு:
- சமைத்த உணவுகளுக்கு மேலே பச்சை இறைச்சிகளை வைக்கக் கூடாது.
- அனைத்து பாத்திரங்களையும் மூடி வைத்திருக்க வேண்டும்.`,
    contentHi: `### रसोई शीत भंडारण एवं डीप-फ्रीजर मानक (SOP)

भोजन की गुणवत्ता और बर्बादी रोकना इस बात पर निर्भर करता है कि रसोई टीम फ्रीजर का रख-रखाव कैसे करती है।

#### 1. तापमान के कड़े नियम:
- **चिलर / सामान्य फ्रिज**: **+2°C से +4°C** (दूध, दही, कटी सब्जियां, बैटर)।
- **डीप-फ्रीजर**: **-18°C या उससे कम** (मांस, चिकन, मछली, आइसक्रीम)।

#### 2. फीफो (FIFO) नियम - पहले आया, पहले उपयोग:
- नया माल हमेशा पुराने माल के **पीछे** रखें।
- पहले से रखे माल का उपयोग पहले करें।
- प्रत्येक तैयार बॉक्स पर तारीख की पर्ची जरूर लगाएं!

#### 3. स्वच्छता और सुरक्षा:
- पके हुए खाने के ऊपर कच्चा मांस कभी न रखें।
- सभी बर्तनों को ढक्कन या क्लिंग रैप से ढककर रखें।`,
    examplesEn: `**Daily Morning Inspection Routine**:
Kitchen helper checks digital temperature display at 6:30 AM.
If Chiller shows +8°C (Too warm!), immediately report to head chef to prevent dairy spoilage.`,
    examplesTa: `**காலை நேரப் பரிசோதனை**:
காலை 6:30 மணிக்கு குளிர்சாதன வெப்பநிலையைப் பார்க்க வேண்டும்.
வெப்பநிலை +8°C ஆக உயர்ந்திருந்தால் பாலில் கெடுதல் ஏற்படலாம், உடனே தலைமை சமையலருக்குத் தெரிவிக்க வேண்டும்.`,
    examplesHi: `**दैनिक सुबह की जांच**:
सुबह 6:30 बजे डिजिटल तापमान देखें।
यदि चिलर +8°C दिखा रहा है (खतरा!), तो दूध खराब होने से बचाने के लिए तुरंत हेड शेफ को बताएं।`,
    faqJson: [
      {
        qEn: "What is the ideal deep freezer temperature?",
        qTa: "டீப் ஃப்ரீசரின் சரியான வெப்பநிலை என்ன?",
        qHi: "डीप-फ्रीजर का सही तापमान क्या होना चाहिए?",
        aEn: "-18°C or colder to inhibit bacterial growth.",
        aTa: "-18°C அல்லது அதற்கும் குறைவான குளிர்ச்சி இருக்க வேண்டும்.",
        aHi: "-18°C या उससे कम ताकि बैक्टीरिया न पनप सके।"
      }
    ],
    targetRoles: ["KITCHEN_TEAM", "CHEF"],
    isKpiLinked: true,
    orderIndex: 6
  }
];

export async function seedPurchasingManual() {
  console.log("Seeding User Manual sections...");
  for (const s of PURCHASING_MANUAL_DATA) {
    await db.insert(userManualSections).values({
      module: s.module,
      submodule: s.submodule,
      slug: s.slug,
      titleEn: s.titleEn,
      titleTa: s.titleTa,
      titleHi: s.titleHi,
      summaryEn: s.summaryEn,
      summaryTa: s.summaryTa,
      summaryHi: s.summaryHi,
      contentEn: s.contentEn,
      contentTa: s.contentTa,
      contentHi: s.contentHi,
      examplesEn: s.examplesEn,
      examplesTa: s.examplesTa,
      examplesHi: s.examplesHi,
      faqJson: s.faqJson,
      targetRoles: s.targetRoles,
      isKpiLinked: s.isKpiLinked,
      orderIndex: s.orderIndex,
    }).onConflictDoUpdate({
      target: [userManualSections.module, userManualSections.slug],
      set: {
        titleEn: s.titleEn,
        titleTa: s.titleTa,
        titleHi: s.titleHi,
        summaryEn: s.summaryEn,
        summaryTa: s.summaryTa,
        summaryHi: s.summaryHi,
        contentEn: s.contentEn,
        contentTa: s.contentTa,
        contentHi: s.contentHi,
        examplesEn: s.examplesEn,
        examplesTa: s.examplesTa,
        examplesHi: s.examplesHi,
        faqJson: s.faqJson,
        targetRoles: s.targetRoles,
        isKpiLinked: s.isKpiLinked,
        orderIndex: s.orderIndex,
        updatedAt: new Date(),
      }
    });
  }
  console.log("Seeded", PURCHASING_MANUAL_DATA.length, "manual sections.");
}

