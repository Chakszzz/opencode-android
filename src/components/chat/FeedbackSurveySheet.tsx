import { useState, useCallback, useMemo, memo } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet"
import { useTranslation } from "react-i18next"
import { submitFeedback, submitSurveyResponse, dismissSurvey } from "../../lib/analytics"

export interface PostHogSurveyData {
  id: string
  name: string
  question?: string
  description?: string
  choices?: string[]
}

interface Props {
  sheetRef: React.RefObject<BottomSheet | null>
  isDark: boolean
  activeSurvey?: PostHogSurveyData | null
  onClose?: () => void
}

type FeedbackCategory = "general" | "bug" | "feature" | "praise"

export const FeedbackSurveySheet = memo(function FeedbackSurveySheet({
  sheetRef,
  isDark,
  activeSurvey,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [rating, setRating] = useState<number>(5)
  const [category, setCategory] = useState<FeedbackCategory>("general")
  const [comment, setComment] = useState("")
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const snapPoints = useMemo(() => ["65%", "85%"], [])

  const handleClose = useCallback(() => {
    Keyboard.dismiss()
    if (activeSurvey && !isSubmitted) {
      dismissSurvey(activeSurvey.id, activeSurvey.name)
    }
    sheetRef.current?.close()
    onClose?.()
    setTimeout(() => {
      setIsSubmitted(false)
      setComment("")
      setSelectedChoice(null)
      setRating(5)
    }, 300)
  }, [activeSurvey, isSubmitted, onClose, sheetRef])

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss()
    setIsSubmitting(true)

    try {
      if (activeSurvey) {
        // Send to PostHog survey response schema
        const responseData = activeSurvey.choices
          ? selectedChoice || comment
          : { rating, comment }
        submitSurveyResponse(activeSurvey.id, activeSurvey.name, responseData)
      } else {
        // Send to PostHog custom feedback schema
        submitFeedback(rating, comment.trim(), category)
      }

      setIsSubmitted(true)
      setTimeout(() => {
        setIsSubmitting(false)
        handleClose()
      }, 1200)
    } catch {
      setIsSubmitting(false)
    }
  }, [activeSurvey, category, comment, handleClose, rating, selectedChoice])

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  )

  const categories: { id: FeedbackCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: "general", label: t("feedback.categories.general"), icon: "chatbubble-ellipses-outline" },
    { id: "bug", label: t("feedback.categories.bug"), icon: "bug-outline" },
    { id: "feature", label: t("feedback.categories.feature"), icon: "bulb-outline" },
    { id: "praise", label: t("feedback.categories.praise"), icon: "heart-outline" },
  ]

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      backdropComponent={renderBackdrop}
      backgroundStyle={[styles.sheetBg, isDark ? styles.sheetBgDark : styles.sheetBgLight]}
      handleIndicatorStyle={[styles.handleIndicator, isDark ? styles.indicatorDark : styles.indicatorLight]}
    >
      <View style={[styles.header, isDark ? styles.borderDark : styles.borderLight]}>
        <View style={styles.headerTitleRow}>
          <Ionicons
            name={activeSurvey ? "newspaper-outline" : "chatbubbles-outline"}
            size={20}
            color={isDark ? "#ffffff" : "#0a0a0a"}
          />
          <Text style={[styles.headerTitle, isDark ? styles.textLight : styles.textDark]}>
            {activeSurvey ? activeSurvey.name : t("feedback.title")}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.closeButton, isDark ? styles.closeButtonDark : styles.closeButtonLight]}
          onPress={handleClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={isDark ? "#ffffff" : "#0a0a0a"} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isSubmitted ? (
          <View style={styles.successState}>
            <View style={[styles.successIconCircle, isDark ? styles.successIconCircleDark : styles.successIconCircleLight]}>
              <Ionicons name="checkmark" size={32} color="#22c55e" />
            </View>
            <Text style={[styles.successTitle, isDark ? styles.textLight : styles.textDark]}>
              {t("feedback.thankYou")}
            </Text>
            <Text style={[styles.successSubtitle, isDark ? styles.metaDark : styles.metaLight]}>
              {t("feedback.submittedNotice")}
            </Text>
          </View>
        ) : (
          <>
            {activeSurvey?.description && (
              <Text style={[styles.description, isDark ? styles.metaDark : styles.metaLight]}>
                {activeSurvey.description}
              </Text>
            )}

            {/* Custom PostHog Survey Choices */}
            {activeSurvey?.choices && activeSurvey.choices.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, isDark ? styles.metaDark : styles.metaLight]}>
                  {activeSurvey.question || t("feedback.selectOption")}
                </Text>
                <View style={styles.choicesList}>
                  {activeSurvey.choices.map((choice) => {
                    const isSelected = selectedChoice === choice
                    return (
                      <TouchableOpacity
                        key={choice}
                        style={[
                          styles.choiceItem,
                          isDark ? styles.choiceItemDark : styles.choiceItemLight,
                          isSelected && (isDark ? styles.choiceSelectedDark : styles.choiceSelectedLight),
                        ]}
                        onPress={() => setSelectedChoice(choice)}
                      >
                        <Ionicons
                          name={isSelected ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={isSelected ? (isDark ? "#ffffff" : "#0a0a0a") : (isDark ? "#666666" : "#999999")}
                        />
                        <Text
                          style={[
                            styles.choiceText,
                            isDark ? styles.textLight : styles.textDark,
                            isSelected && styles.choiceTextBold,
                          ]}
                        >
                          {choice}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            ) : (
              <>
                {/* Category Pills */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, isDark ? styles.metaDark : styles.metaLight]}>
                    {t("feedback.categoryTitle")}
                  </Text>
                  <View style={styles.categoriesRow}>
                    {categories.map((cat) => {
                      const isSelected = category === cat.id
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryChip,
                            isDark ? styles.categoryChipDark : styles.categoryChipLight,
                            isSelected && (isDark ? styles.categorySelectedDark : styles.categorySelectedLight),
                          ]}
                          onPress={() => setCategory(cat.id)}
                        >
                          <Ionicons
                            name={cat.icon}
                            size={15}
                            color={isSelected ? (isDark ? "#0a0a0a" : "#ffffff") : (isDark ? "#888888" : "#666666")}
                          />
                          <Text
                            style={[
                              styles.categoryText,
                              isSelected
                                ? (isDark ? styles.categoryTextSelectedDark : styles.categoryTextSelectedLight)
                                : (isDark ? styles.metaDark : styles.metaLight),
                            ]}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>

                {/* Star / Rating Scale */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, isDark ? styles.metaDark : styles.metaLight]}>
                    {t("feedback.ratingTitle")}
                  </Text>
                  <View style={styles.ratingRow}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = rating >= star
                      return (
                        <TouchableOpacity
                          key={star}
                          style={styles.ratingStarBtn}
                          onPress={() => setRating(star)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons
                            name={isActive ? "star" : "star-outline"}
                            size={32}
                            color={isActive ? (isDark ? "#ffffff" : "#0a0a0a") : (isDark ? "#333333" : "#d1d5db")}
                          />
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              </>
            )}

            {/* Comment Text Input */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isDark ? styles.metaDark : styles.metaLight]}>
                {t("feedback.commentsTitle")}
              </Text>
              <BottomSheetTextInput
                style={[
                  styles.textInput,
                  isDark ? styles.textInputDark : styles.textInputLight,
                ]}
                placeholder={t("feedback.commentsPlaceholder")}
                placeholderTextColor={isDark ? "#666666" : "#999999"}
                multiline
                numberOfLines={4}
                maxLength={1000}
                value={comment}
                onChangeText={setComment}
              />
              <Text style={[styles.charCount, isDark ? styles.metaDark : styles.metaLight]}>
                {comment.length}/1000
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isDark ? styles.submitButtonDark : styles.submitButtonLight,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={isDark ? "#0a0a0a" : "#ffffff"} />
              ) : (
                <>
                  <Ionicons name="send" size={16} color={isDark ? "#0a0a0a" : "#ffffff"} />
                  <Text style={[styles.submitButtonText, isDark ? styles.submitTextDark : styles.submitTextLight]}>
                    {t("feedback.submit")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

const styles = StyleSheet.create({
  sheetBg: {
    borderRadius: 20,
  },
  sheetBgLight: {
    backgroundColor: "#ffffff",
  },
  sheetBgDark: {
    backgroundColor: "#141414",
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  indicatorLight: {
    backgroundColor: "#d1d5db",
  },
  indicatorDark: {
    backgroundColor: "#333333",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  borderLight: {
    borderBottomColor: "#e5e7eb",
  },
  borderDark: {
    borderBottomColor: "#262626",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonLight: {
    backgroundColor: "#f5f5f5",
  },
  closeButtonDark: {
    backgroundColor: "#222222",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  categoriesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipLight: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
  categoryChipDark: {
    backgroundColor: "#1e1e1e",
    borderColor: "#333333",
  },
  categorySelectedLight: {
    backgroundColor: "#0a0a0a",
    borderColor: "#0a0a0a",
  },
  categorySelectedDark: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "500",
  },
  categoryTextSelectedLight: {
    color: "#ffffff",
  },
  categoryTextSelectedDark: {
    color: "#0a0a0a",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 8,
  },
  ratingStarBtn: {
    padding: 4,
  },
  choicesList: {
    gap: 8,
  },
  choiceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  choiceItemLight: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
  choiceItemDark: {
    backgroundColor: "#1e1e1e",
    borderColor: "#333333",
  },
  choiceSelectedLight: {
    borderColor: "#0a0a0a",
    backgroundColor: "#f0f0f0",
  },
  choiceSelectedDark: {
    borderColor: "#ffffff",
    backgroundColor: "#2a2a2a",
  },
  choiceText: {
    fontSize: 14,
    flex: 1,
  },
  choiceTextBold: {
    fontWeight: "600",
  },
  textInput: {
    minHeight: 90,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    textAlignVertical: "top",
    borderWidth: 1,
  },
  textInputLight: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
    color: "#0a0a0a",
  },
  textInputDark: {
    backgroundColor: "#1e1e1e",
    borderColor: "#333333",
    color: "#ffffff",
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonLight: {
    backgroundColor: "#0a0a0a",
  },
  submitButtonDark: {
    backgroundColor: "#ffffff",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  submitTextLight: {
    color: "#ffffff",
  },
  submitTextDark: {
    color: "#0a0a0a",
  },
  successState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successIconCircleLight: {
    backgroundColor: "#f0fdf4",
  },
  successIconCircleDark: {
    backgroundColor: "#052e16",
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  textDark: {
    color: "#0a0a0a",
  },
  textLight: {
    color: "#ffffff",
  },
  metaLight: {
    color: "#6b7280",
  },
  metaDark: {
    color: "#9ca3af",
  },
})
