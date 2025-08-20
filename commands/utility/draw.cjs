const {
  SlashCommandBuilder,
  MessageFlags,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");

const path = require("path");
const fs = require("fs");

const ffmpeg = require("fluent-ffmpeg");



module.exports = {
  data: new SlashCommandBuilder()
    .setName("draw")
    .setDescription("Turn an image into a painting")
    .addAttachmentOption((option) =>
      option
        .setName("image")
        .setDescription("Upload an image (optional)")
        .setRequired(false)
    ),

  async execute(interaction) {
    let attachment = interaction.options.getAttachment("image");

    if (!attachment) {
      const defaultImageUrl =
        "https://images.unsplash.com/photo-1494984858525-798dd0b282f5?q=80&w=2070";
      const response = await fetch(defaultImageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      attachment = {
        url: defaultImageUrl,
        name: "input.png",
        buffer,
      };
    }

    await interaction.reply({
      content: "🎨 Acrylic bot is drawing your image. This may take a while...",
      flags: MessageFlags.Ephemeral,
    });

    let tempVideo, tempGif, tempPalette, tempOutputImage;

    try {
      // Fetch image as blob
      const imageResponse = await fetch(attachment.url);
      const imageBlob = await imageResponse.blob();

      // Connect to Gradio
      const { Client: GradioClient } = await import("@gradio/client");
      const client = await GradioClient.connect("lasercatz/image2painting");
      const result = await client.predict("/predict", { input_img: imageBlob });

      const videoUrl = result.data[2].video.url;
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

      tempVideo = path.join(__dirname, "temp.mp4");
      tempGif = path.join(__dirname, "painting.gif");
      tempPalette = path.join(__dirname, "palette.png");

      fs.writeFileSync(tempVideo, videoBuffer);

      // Step 1: Generate palette for GIF
      await new Promise((resolve, reject) => {
        ffmpeg(tempVideo)
          .outputOptions([
            "-vf",
            "fps=15,scale=512:-1:flags=lanczos,palettegen=stats_mode=full:max_colors=256",
          ])
          .save(tempPalette)
          .on("end", resolve)
          .on("error", reject);
      });

      // Step 2: Create GIF using palette
      await new Promise((resolve, reject) => {
        ffmpeg(tempVideo)
          .input(tempPalette)
          .outputOptions([
            "-lavfi",
            "fps=15,scale=512:-1:flags=lanczos [x]; [x][1:v] paletteuse",
            "-loop",
            "0",
            "-pix_fmt",
            "rgb24",
          ])
          .toFormat("gif")
          .save(tempGif)
          .on("end", resolve)
          .on("error", reject);
      });

      const gifAttachment = new AttachmentBuilder(fs.readFileSync(tempGif), {
        name: "painting.gif",
      });

      // Fetch final painted image
      const outputImageUrl = result.data[1].url;
      const outputImageResponse = await fetch(outputImageUrl);
      const imageBuffer = Buffer.from(await outputImageResponse.arrayBuffer());
      tempOutputImage = path.join(__dirname, "painting.png");
      fs.writeFileSync(tempOutputImage, imageBuffer);

      const imageAttachment = new AttachmentBuilder(imageBuffer, {
        name: "painting.png",
      });

      // Fetch cropped input image
      const inputImageUrl = result.data[0].url;
      const embed = new EmbedBuilder()
        .setDescription("This is the cropped input image.")
        .setColor(0x0099ff)
        .setImage(inputImageUrl)

      await interaction.followUp({
        content: `**🎨 Painting generation**\n\`.gif\``,
        embeds: [embed],
        files: [gifAttachment, imageAttachment],
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "There was an error generating the painting.",
        ephemeral: true,
      });
    } finally {
      // Clean up temp files
      [tempVideo, tempGif, tempPalette, tempOutputImage].forEach((file) => {
        try {
          if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch (cleanupErr) {
          console.error(`Failed to delete ${file}:`, cleanupErr);
        }
      });
    }
  },
};
