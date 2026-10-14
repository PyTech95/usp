"""Apply client-supplied copy (Oct 2026 PDFs), the Craft & Livelihood mockup, the font/colour sheet and the new navigation.
Writes draft + published. Usage: cd /app/backend && python scripts/apply_client_content.py"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core import db, now, new_id  # noqa: E402

FILES = {"group": "Original4-edited.webp", "weaver": "Original-edited.webp", "baskets": "image(20261010-060354).png", "reading": "WhatsApp Image 2026-10-10 at 10.10.24 AM.jpeg",
         "bowls": "WhatsApp Image 2026-10-10 at 10.16.09 AM.jpeg", "blue": "blue-basket-border-removed.png", "textile": "image(20261010-060445).png",
         "figures": "image(20261010-060534).png", "door": "image(20261010-060550).png", "dolls": "WhatsApp Image 2026-09-21 at 12.58.20 AM.jpeg"}
THEME = {"colors": {"background": "#F9F9F9", "surface": "#EDEAE7", "text": "#575757", "green": "#454545", "terracotta": "#76716B", "ochre": "#8C847C"},
         "fonts": {"heading": "Public Sans", "body": "Public Sans"}, "spacing": "comfortable", "button_style": "square", "base_size": 18}


def P(*paras):
    return "".join(f"<p>{x}</p>" for x in paras)


def sec(type_, **data):
    return {"id": new_id(), "type": type_, "hidden": False, "data": data}


def im(m):
    return {"media_id": m, "caption": ""}


def menu():
    def c(i, label, href):
        return {"id": i, "label": label, "href": href}
    return [
        {"id": "m-home", "label": "Home", "href": "/", "required": True, "children": []},
        {"id": "m-about", "label": "About", "href": "/about", "required": True, "children": [c("m-team", "Team", "/about#team")]},
        {"id": "m-work", "label": "Our Work", "href": "/our-work", "required": True, "children": [
            {"id": "m-rak", "label": "Rakhigarhi", "href": "/our-work/rakhigarhi", "required": True, "children": [
                c("m-rak-1", "Archaeology & Rakhigarhi", "/our-work/rakhigarhi#archaeology"),
                c("m-rak-2", "The Rakhigarhi Haveli and Chaupal", "/our-work/rakhigarhi#haveli-chaupal"),
                c("m-rak-3", "Heritage Guide Program", "/our-work/workshops-learning#heritage-guide"),
                c("m-rak-4", "Women, Craft & Livelihood", "/our-work/craft-livelihood")]},
            {"id": "m-the", "label": "Theatre", "href": "/our-work/theatre", "required": True, "children": [
                c("m-the-1", "Stories Brought to Life", "/our-work/theatre"),
                c("m-the-2", "The Prayer Meeting Edit", "/our-work/theatre#prayer-meeting"),
                c("m-the-3", "Past Work", "/our-work/theatre#past-work")]},
            {"id": "m-cra", "label": "Craft & Livelihood", "href": "/our-work/craft-livelihood", "required": True, "children": [
                c("m-cra-1", "Craft Centre at the Haveli and Chaupal", "/our-work/craft-livelihood#craft-centre"),
                c("m-cra-2", "Basket Making", "/our-work/craft-livelihood#basket-making"),
                c("m-cra-3", "Papier-Mâché", "/our-work/craft-livelihood#papier-mache"),
                c("m-cra-4", "Dhurrie Weaving", "/our-work/craft-livelihood#dhurrie-weaving"),
                c("m-cra-5", "The Impact and the Ambition", "/our-work/craft-livelihood#impact-ambition")]},
            {"id": "m-wor", "label": "Workshops & Learning", "href": "/our-work/workshops-learning", "required": True, "children": [
                c("m-wor-1", "Training – Heritage Guide", "/our-work/workshops-learning#heritage-guide"),
                c("m-wor-2", "Restoration Skills", "/our-work/workshops-learning#restoration-skills"),
                c("m-wor-3", "Creative Exchange", "/our-work/workshops-learning#creative-exchange"),
                c("m-wor-4", "Student Projects", "/our-work/workshops-learning#student-projects")]},
        ]},
        {"id": "m-notes", "label": "Field Notes", "href": "/field-notes", "required": True, "children": []},
        {"id": "m-connect", "label": "Connect", "href": "/connect", "required": True, "children": []},
    ]


def home(M, old):
    mosaic = next((s for s in old if s["type"] == "gallery"), None)
    return [
        sec("hero", eyebrow="Urban Suburban Perspectives", heading="What We Inherit. What We Create. What We Carry Forward.",
            intro="Culture isn’t fixed in time. It is inherited and reinterpreted, questioned and created, lived and shared.\n\nUrban Suburban Perspectives works across Heritage, Art and Culture, exploring how what we inherit continues to find meaning in contemporary life.",
            image=im(M["group"]), buttons=[{"label": "Explore Our Work", "href": "/our-work"}, {"label": "Read Field Notes", "href": "/field-notes"}]),
        sec("text", eyebrow="Who We Are", heading="Heritage, Art and Culture — Kept in Motion.", style="columns", body_html=P(
            "A place, a building, a story, a tradition or a way of making can hold meaning far beyond where it began.",
            "USP brings together people, knowledge and different perspectives to explore how these inheritances can remain meaningful in the present—and become a starting point for new ideas, creative expression and opportunity.",
            "Across Heritage, Art and Culture, the work takes different forms, each shaped by its own context and the people involved. Through it, people can develop skills, share knowledge, shape what is created and open new pathways to livelihood.")),
        sec("related_work", eyebrow="Our Work", heading="Shaped by Place, Knowledge and Perspectives.",
            intro="Each initiative begins differently—with a place, an idea, a practice or a question worth exploring. Its direction develops from the context and from the knowledge and perspectives that become part of the work.",
            items=[
                {"title": "Rakhigarhi", "subtitle": "5,000 Years of History. A Place Still Evolving.", "text": "One of the most significant archaeological sites of the Indus Valley Civilisation is also a living village—where history, architecture, knowledge and everyday life continue alongside one another.", "href": "/our-work/rakhigarhi", "image": im(M["door"])},
                {"title": "Theatre", "subtitle": "Stories Brought to Life. Conversations Opened.", "text": "USP creates original theatre drawn from culture, lived experiences and familiar relationships, rituals and social conventions that shape everyday life.", "href": "/our-work/theatre", "image": im(M["reading"])},
                {"title": "Craft & Livelihood", "subtitle": "Where Tradition Finds New Expression.", "text": "In Rakhigarhi, women are developing craft through knowledge, practice and creative exchange—strengthening skills while creating pathways to livelihood.", "href": "/our-work/craft-livelihood", "image": im(M["bowls"])},
                {"title": "Workshops & Learning", "subtitle": "Knowledge Shared. Skills Developed.", "text": "Learning happens through real work—from interpreting the history of a place and restoring a historic building to making, designing and participating in projects as they develop.", "href": "/our-work/workshops-learning", "image": im(M["figures"])},
            ]),
        sec("image", image=im(M["baskets"]), layout="full"),
        sec("text", eyebrow="What Takes Shape", heading="The Value Can Extend Beyond the Initiative.", style="stacked", band=True, body_html=P(
            "A restored building can find new purpose. Conservation skills can remain with the people who learn them. Knowledge of a place can become a livelihood. Craft can develop new forms and economic value. A performance can leave behind a conversation.",
            "What begins through one initiative can create possibilities beyond it.")),
        *([mosaic] if mosaic else []),
        sec("notes_feed", eyebrow="Field Notes", heading="From the Work, as It Unfolds.", intro="Some of the most interesting experiences happen along the way. Small observations, discoveries and stories from the people and places that are part of USP's work.", count=3, category=""),
        sec("contact_invite", eyebrow="Connect", heading="Be Part of What Takes Shape Next.", text="There are different ways to become part of the work—through collaboration, participation, learning, or support for an initiative.",
            button_label="Get in Touch", href="/connect", buttons=[{"label": "Collaborate", "href": "/connect?topic=Collaboration"}, {"label": "Volunteer", "href": "/connect?topic=Volunteer"}, {"label": "Get in Touch", "href": "/connect"}]),
    ]


def theatre(M):
    return [
        sec("hero", eyebrow="Theatre", heading="Stories Brought to Life. Conversations Opened.", image=im(M["reading"]), buttons=[],
            intro="Original stories rooted in the world around us.\n\nDrawn from shared experiences, personal reflections and familiar situations, USP's productions bring stories to the stage that audiences can recognise, enjoy and sometimes see differently."),
        sec("text", eyebrow="Culture in Everyday Life", heading="The Worlds We Live In.", style="columns", body_html=P(
            "Culture is not only found in architecture, craft, festivals, and traditions. It also lives in family relationships, social conventions, rituals, expectations, and the way people relate to one another.",
            "Theatre allows USP to explore this less tangible side of culture—bringing familiar experiences and situations to the stage through storytelling, humour and performance.",
            "Some stories entertain. Others make us question. The most memorable can do both.")),
        sec("text", eyebrow="Current Production", heading="The Prayer Meeting Edit", subheading="A Familiar Setting. A Contemporary Conversation.", style="stacked", band=True, anchor="prayer-meeting", body_html=P(
            "The Prayer Meeting Edit is an original comedy set around a chautha—a familiar cultural gathering for prayer and remembrance.",
            "As family and friends come together, relationships, expectations and social conventions begin to surface. What should be solemn becomes revealing, uncomfortable and unexpectedly funny.",
            "Beneath the humour lies a contemporary question: how involved are women in the financial decisions that shape their own lives?",
            "Through recognisable characters and situations, the play brings that question into view, opening conversations about money, independence, and women's involvement in decisions affecting their lives.")),
        sec("text", eyebrow="Theatre Over Time", heading="More Than a Decade of Original Work.", style="columns", anchor="past-work", body_html=P(
            "For more than a decade, USP has developed and staged original theatre across a range of subjects, settings, and characters.",
            "Each production has its own story, tone, and perspective. Together, they reflect an ongoing interest in the cultural and social worlds around us.")),
        sec("text", eyebrow="The Ambition", heading="Stories That Travel Beyond the Stage.", style="stacked", band=True, aside="The performance ends. What it opens up can continue.", body_html=P(
            "The ambition is to continue developing original theatre that is engaging, culturally rooted, and relevant to contemporary life.",
            "As the work grows, USP hopes to reach wider audiences and create space for different stories and perspectives, while remaining connected to the experiences and cultural contexts from which they emerge.")),
        sec("notes_feed", heading="Related Field Notes", count=3, category="Theatre"),
    ]


def craft(M):
    return [
        sec("hero", eyebrow="Craft & Livelihood", heading="Made by Hand. Shaped by Knowledge.", image=im(M["weaver"]), buttons=[],
            intro="In Rakhigarhi, women are building on existing knowledge and ways of making. Through practice and creative exchange, they are developing skills, individual expression and new pathways to livelihood."),
        sec("text", eyebrow="Knowledge Carried Forward", heading="Not everything we know is formally taught.", style="columns", body_html=P(
            "Ways of choosing materials, judging a form or working with colour are often learned through watching, doing and making alongside others.",
            "USP brings women in Rakhigarhi together with artists, designers and craft practitioners to build on this knowledge. Together, they test and adapt new materials, techniques and ideas, developing work rooted in the place and shaped by the women involved.")),
        sec("text", eyebrow="Three Crafts", heading="Basket Making. Papier-Mâché. Dhurrie Weaving.", style="stacked", body_html=P(
            "Three crafts form the starting point of the initiative. Each brings its own materials, techniques and possibilities for colour, pattern and form.")),
        sec("image_text", eyebrow="Basket Making", heading="Tradition carried forward through colour, pattern and form.", image=im(M["blue"]), image_side="left", anchor="basket-making", crop="4/5", body_html=P(
            "Basket making draws on skills and ways of working already present within the community. Through the initiative, women are exploring new combinations of colour, pattern and form while developing the consistency and finish of the work.")),
        sec("image", eyebrow="Papier-Mâché", heading="A new material. A new direction.", image=im(M["figures"]), layout="full", band=True, anchor="papier-mache", body_html=P(
            "Papier-mâché introduces a different material and process into the initiative. Women are experimenting with form, surface and decoration, developing objects that combine individual expression with the visual language emerging from the group.")),
        sec("image_text", eyebrow="Dhurrie Weaving", heading="Textile knowledge carried forward through pattern and composition.", image=im(M["textile"]), image_side="right", anchor="dhurrie-weaving", crop="2/3", body_html=P(
            "The patterns and motifs woven into the dhurries draw on designs passed down through generations within the community. Women use these as a starting point for new combinations of colour and composition—carrying local textile knowledge into the work being created today.")),
        sec("text", eyebrow="The Craft Centre", heading="A Place for the Work to Continue.", style="columns", anchor="craft-centre", body_html=P(
            "The Craft Centre within the Rakhigarhi Haveli and Chaupal will give the initiative a shared home—a place for women to work together, develop designs and techniques, share knowledge and build consistency in what they produce.",
            "Visitors will be able to encounter the work and understand the people, materials, and processes behind it.")),
        sec("image", image=im(M["group"]), layout="full", flush=True, crop="2/1"),
        sec("text", eyebrow="Impact & Livelihood", heading="Creating Value Through Craft.", style="stacked", anchor="impact-ambition", body_html=P(
            "As baskets, papier-mâché and dhurries develop into products with wider appeal and economic value, they can create opportunities for women to earn.",
            "Women are also contributing ideas, developing products and becoming more involved in decisions about how the initiative grows.",
            "As the work gains value, so do the opportunities around it.")),
        sec("text", eyebrow="The Ambition", heading="From Rakhigarhi, Outwards.", style="stacked", band=True,
            aside="Rakhigarhi is known for its extraordinary past. The ambition is to make what is created here part of its future.", body_html=P(
                "The work begins in Rakhigarhi, with the ambition to reach wider audiences through collections, creative collaborations, and partnerships.",
                "The aim is for craft from Rakhigarhi to be recognised for its quality, character and originality—with women increasingly shaping what is created and where it goes next.")),
        {**sec("contact_invite", heading="Craft enquiries", text="Questions about craft and makers can be sent through Connect.", button_label="Send a craft enquiry", href="/connect?topic=Craft"), "hidden": True},
    ]


def workshops(M):
    return [
        sec("hero", eyebrow="Workshops & Learning", heading="Learning, Sharing, and Passing It On.", image=im(M["bowls"]), buttons=[],
            intro="For generations, people have learned from one another—through stories told, skills demonstrated, techniques practised and knowledge passed from one person to the next.\n\nUSP carries that very human way of learning into its work today—creating opportunities to learn through participation, practice and exchange.\n\nWhat matters is not simply what is taught, but what people are able to do with what they learn."),
        sec("text", eyebrow="Heritage Guide Program", heading="Knowing Rakhigarhi. Sharing Its Story.", style="columns", anchor="heritage-guide", body_html=P(
            "Who better to tell the story of a place than the women who call it home?",
            "The Heritage Guide Program works with women from Rakhigarhi to deepen their understanding of the village's archaeology, history and heritage, while developing the skills and confidence to interpret it for visitors.",
            "The program gives women a greater role in how Rakhigarhi is presented and understood, while creating an opportunity for knowledge of their own place to become a livelihood.")),
        sec("text", eyebrow="Restoration Skills", heading="Learning Through the Haveli.", style="columns", band=True, anchor="restoration-skills", body_html=P(
            "As the Rakhigarhi haveli and chaupal are restored, local construction workers learn alongside conservation professionals, developing and applying techniques for working with historic buildings.",
            "The building itself becomes a place of learning, with each stage of restoration offering practical experience.",
            "These skills remain with the people who learn them, extending the value of the restoration beyond the building itself.")),
        sec("image_text", eyebrow="Creative Exchange", heading="New Ideas. New Directions.", image=im(M["reading"]), image_side="right", anchor="creative-exchange", body_html=P(
            "Artists, designers and craft practitioners work alongside women in Rakhigarhi, bringing different skills and perspectives to the making process.",
            "The women’s existing knowledge provides a starting point. Together, they explore materials, techniques, colour, pattern and form—testing and adapting ideas through practice.",
            "Alongside creative development, the aim is to strengthen the quality and appeal of the work, opening up market opportunities and the possibility of better returns for the women who make it.")),
        sec("text", eyebrow="Student Projects", heading="Learning That Becomes a Contribution.", style="columns", anchor="student-projects", body_html=P(
            "Students can contribute to USP’s initiatives by putting their learning into practice.",
            "One student’s research into Rakhigarhi led to a series of short films created as learning resources for women participating in the Heritage Guide Program. A further Q&amp;A film is being developed around questions visitors may ask.",
            "What began as a student learning project became a resource that others could use.")),
        sec("text", eyebrow="The Ambition", heading="Knowledge That Continues to Travel.", style="stacked", band=True, body_html=P(
            "The ambition is for learning to extend beyond any one workshop, project or exchange. Skills can be used again. Knowledge can be shared. Ideas can be adapted and passed on.",
            "Over time, this can give people greater confidence to participate, contribute to their communities, and pursue new opportunities—including opportunities to earn a livelihood.")),
        sec("notes_feed", heading="Workshop reflections", count=3, category="Workshops & Learning"),
        sec("contact_invite", heading="Learn. Contribute. Take Part.", text="USP welcomes students, designers, practitioners and others who want to learn through the work, contribute their knowledge, or share their expertise.",
            button_label="Connect with USP", href="/connect?topic=Workshops%20%26%20Learning"),
    ]


def patch_sections(sections, renames):
    for s in sections:
        h = s["data"].get("heading")
        if h in renames:
            new_h, anchor = renames[h]
            s["data"]["heading"] = new_h
            s["data"]["anchor"] = anchor
    return sections


NOTES = [
    ("what-was-already-there", "What Was Already There.", "Objects, memories and traces of everyday life encountered through the work.", "Rakhigarhi", ["Heritage"]),
    ("the-og-basket-makers", "The OG Basket Makers.", "Two experienced basket makers whose knowledge and skill inspire a new generation.", "Craft & Livelihood", ["Craft"]),
]


async def main():
    M = {}
    for k, f in FILES.items():
        M[k] = (await db.media.find_one({"filename": f, "is_deleted": False}, {"id": 1}))["id"]
    await db.settings.update_one({"key": "site"}, {"$set": {"theme": THEME, "menus.main": menu(), "updated_at": now()}})
    old_home = (await db.pages.find_one({"key": "home"}))["published"]["sections"]
    builders = {"home": lambda: home(M, old_home), "theatre": lambda: theatre(M), "craft-livelihood": lambda: craft(M), "workshops-learning": lambda: workshops(M)}
    for key, build in builders.items():
        p = await db.pages.find_one({"key": key}, {"_id": 0})
        sections = build()
        content = {**p["published"], "sections": sections}
        await db.revisions.insert_one({"id": new_id(), "entity_type": "page", "entity_id": p["id"], "content": p["published"], "action": "before client copy import", "by": "import", "created_at": now()})
        await db.pages.update_one({"key": key}, {"$set": {"draft": content, "published": content, "has_unpublished_changes": False, "published_at": now(), "updated_at": now()}})
        print("updated", key)
    for key, renames in {"rakhigarhi": {"Historical context": ("Archaeology & Rakhigarhi", "archaeology"), "USP's activities": ("The Rakhigarhi Haveli and Chaupal", "haveli-chaupal")},
                         "about": {"Team": ("Team", "team")}}.items():
        p = await db.pages.find_one({"key": key}, {"_id": 0})
        await db.pages.update_one({"key": key}, {"$set": {"draft.sections": patch_sections(p["draft"]["sections"], renames),
                                                          "published.sections": patch_sections(p["published"]["sections"], renames), "updated_at": now()}})
        print("anchored", key)
    for slug, title, standfirst, cat, tags in NOTES:
        if await db.notes.find_one({"slug": slug}):
            continue
        d = {"title": title, "slug": slug, "standfirst": standfirst, "kind": "article", "author": "USP India editorial team (placeholder)", "category": cat, "tags": tags,
             "body_html": "<p>Draft placeholder — awaiting the story text from the client.</p>", "cover": {"media_id": "", "caption": ""}, "credits": "", "references": [], "downloads": [], "related": [],
             "seo": {"title": "", "description": standfirst, "canonical": "", "noindex": False, "share_media_id": ""}}
        await db.notes.insert_one({"id": new_id(), "slug": slug, "draft": d, "published": None, "status": "draft", "created_by": "import",
                                   "created_at": now(), "updated_at": now(), "has_unpublished_changes": True})
        print("draft note", slug)


if __name__ == "__main__":
    asyncio.run(main())
